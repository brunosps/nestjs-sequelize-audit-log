/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { QueryTypes, Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';

type InformationSchemaType = {
  table: string;
  fields: string[];
  pk: string[];
};

@Injectable()
export class AuditLogDatabaseService {
  auditLogTable: string;
  auditLogDetailTable: string;

  async onModuleInit() {
    if (this.auditedTables.length > 0) {
      this.createBaseTriggers();
    } else {
      this.disableAll();
    }

    this.auditedTables.forEach(async (table) => {
      try {
        await this.enable(table);
      } catch (error) {
        console.error('\n\nAuditService ERROR');
        console.error(error);
        console.error('\n\n');
      }
    });
  }

  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
    @Inject('AUDITEDTABLES')
    private auditedTables: Array<string>,
    @Inject('ENABLETRIGGERDEBUGLOG')
    private enableTriggerDebugLog: boolean,
  ) {
    this.auditLogTable = 'audit_logs';
    this.auditLogDetailTable = 'audit_logs_entity';
  }

  // Added getUser method (placeholder implementation)
  private getUser(): { id?: string; ipAddress?: string } {
    // In a real application, this would come from CLS, request context, etc.
    return { id: 'system_user', ipAddress: '127.0.0.1' };
  }

  public async createBaseTriggers() {
    const scriptsToExecute = [
      `DROP FUNCTION IF EXISTS get_table_schema`,
      this.baseScripts('get_table_schema'),
      `DROP FUNCTION IF EXISTS generate_changed_json`,
      this.baseScripts('generate_changed_json'),
      `DROP FUNCTION IF EXISTS uuid_v4`,
      this.baseScripts('uuid_v4'),
    ].forEach(async (sqlCmd) => await this.execScript(sqlCmd!));
  }

  public async enable(tableName: string, fields: string[] = []) {
    const schema = await this.getSchema(tableName, fields);
    await this.disbleAudit(schema.table);
    await this.enableAudit(schema);
  }

  public async disable(tableName: string) {
    const schema = await this.getSchema(tableName, []);
    this.disbleAudit(schema.table);
  }

  public async disableAll() {
    const results = await this.sequelize.query<{ TABLE_NAME: string }>(
      this.sqlAuditedTables(),
      {
        type: QueryTypes.SELECT,
        raw: true,
        retry: {
          max: 2,
        },
      },
    );

    results.forEach(async (r) => {
      await this.disbleAudit(r.TABLE_NAME);
    });

    [
      `DROP FUNCTION IF EXISTS get_table_schema`,
      `DROP FUNCTION IF EXISTS generate_changed_json`,
      `DROP FUNCTION IF EXISTS uuid_v4`,
    ].forEach(async (sqlCmd) => await this.execScript(sqlCmd));
  }

  private enableAudit(schema: InformationSchemaType) {
    const triggers = [
      this.templateDeleteTrigger(schema),
      this.templateCreateTrigger(schema),
      this.templateUpdateTrigger(schema),
    ];

    triggers.forEach(async (trigger) => {
      await this.execScript(trigger);
    });
  }

  private async execScript(sqlCmd: string) {
    try {
      await this.sequelize.query(sqlCmd.replace(/\n/g, ''), { raw: true });
    } catch (err) {
      console.error('Error executing SQL script:', err);
      console.error('SQL Command:', sqlCmd);
    }
  }

  private async getSchema(
    tableName: string,
    selectedFields: string[],
  ): Promise<InformationSchemaType> {
    const results = await this.sequelize.query<{
      TABLE_NAME: string;
      COLUMN_NAME: string;
      COLUMN_KEY: string;
    }>(this.sqlSchemaInformation(), {
      type: QueryTypes.SELECT,
      replacements: { tableName },
      raw: true,
      retry: {
        max: 2,
      },
    });

    if (results.length == 0) {
      throw new Error(`Not found table ${tableName}`);
    }

    const table = results[0].TABLE_NAME;
    const fields: Array<string> = [];
    const pk: Array<string> = [];

    selectedFields = selectedFields.map((f) => f.toUpperCase());

    results.forEach((result) => {
      selectedFields.length == 0 ||
        selectedFields.includes(result.COLUMN_NAME.toUpperCase());

      fields.push(result.COLUMN_NAME);

      if (result.COLUMN_KEY === 'PRI') {
        pk.push(result.COLUMN_NAME);
      }
    });

    return {
      table,
      fields,
      pk,
    };
  }

  private sqlAuditedTables() {
    return `
            SELECT DISTINCT EVENT_OBJECT_TABLE AS TABLE_NAME
            FROM information_schema.triggers
            WHERE trigger_schema = DATABASE()
            AND UPPER(trigger_name) LIKE 'AUDIT_LOG_%'`;
  }

  private sqlSchemaInformation() {
    return `
            SELECT TABLE_NAME, COLUMN_NAME, COLUMN_KEY
            FROM information_schema.columns 
            WHERE TABLE_SCHEMA = DATABASE() AND UPPER(TABLE_NAME) = UPPER(LTRIM(RTRIM(:tableName)))
        `;
  }

  private async disbleAudit(tableName: string) {
    await this.sequelize.query(
      `DROP TRIGGER IF EXISTS audit_log_delete_${tableName};`,
    );
    await this.sequelize.query(
      `DROP TRIGGER IF EXISTS audit_log_create_${tableName};`,
    );
    await this.sequelize.query(
      `DROP TRIGGER IF EXISTS audit_log_update_${tableName};`,
    );
  }

  private templateDeleteTrigger(schema: InformationSchemaType) {
    const NULL_MARKER = '@@MYSQL_AUDIT_NULL@@';
    const params = {
      tableName: schema.table,
      fields: schema.fields.join(', '),
      oldFields: schema.fields
        .map((f) => `IFNULL(OLD.${f}, '${NULL_MARKER}')`)
        .join(', '),
      auditLogTable: this.auditLogTable,
      auditLogDetailTable: this.auditLogDetailTable,
      entityPk: `${schema.pk.join('+')}`,
    };
    return `
            CREATE TRIGGER audit_log_delete_${params.tableName}
            BEFORE DELETE ON ${params.tableName}
            FOR EACH ROW
            BEGIN
                DECLARE fields TEXT;
                DECLARE old_row TEXT;
                DECLARE new_row TEXT;
                DECLARE new_json TEXT;
                DECLARE old_json TEXT;
                DECLARE changed TEXT;
                DECLARE logId VARCHAR(36);

                DECLARE current_user_id VARCHAR(255);
                DECLARE current_user_ip VARCHAR(255);
                SET current_user_id = IFNULL(@user_id, 'unknown');
                SET current_user_ip = IFNULL(@user_ip, '0.0.0.0');

                SET fields = "${params.fields}";
                SET old_row = CONCAT_WS(",", ${params.oldFields});
                SET new_row = "";
                
                SET new_json = "{}";
                SET old_json = generate_changed_json("", old_row, fields);
                SET changed = "{}";
                
                SET logId = uuid_v4();

                ${
                  this.enableTriggerDebugLog
                    ? `INSERT INTO trigger_debug_log (trigger_event, old_row_data, new_row_data, fields_data, changed_output, old_json_output, new_json_output)
                VALUES ('DELETE_${params.tableName}', old_row, new_row, fields, changed, old_json, new_json);`
                    : ''
                }

                INSERT INTO ${params.auditLogTable} (id, log_type, ip_address, user_id) 
                        VALUES (logId, 'ENTITY', current_user_ip, current_user_id);
                
                INSERT INTO ${params.auditLogDetailTable} (log_id, id, action, entity, entity_pk, changed_values, \`before_change\`, after_change, table_schema) 
                        VALUES (logId, uuid_v4(), 'DELETE', '${params.tableName}', '${params.entityPk}', changed, old_json, new_json, get_table_schema('${params.tableName}'));
            END;
        `;
  }

  private templateCreateTrigger(schema: InformationSchemaType) {
    const NULL_MARKER = '@@MYSQL_AUDIT_NULL@@';
    const params = {
      tableName: schema.table,
      fields: schema.fields.join(', '),
      newFields: schema.fields
        .map((f) => `IFNULL(NEW.${f}, '${NULL_MARKER}')`)
        .join(', '),
      auditLogTable: this.auditLogTable,
      auditLogDetailTable: this.auditLogDetailTable,
      entityPk: `${schema.pk.join('+')}`,
    };
    return `       
            CREATE TRIGGER audit_log_create_${params.tableName}
            AFTER INSERT ON ${params.tableName}
            FOR EACH ROW
            BEGIN
                DECLARE fields TEXT;
                DECLARE old_row TEXT;
                DECLARE new_row TEXT;
                DECLARE new_json TEXT;
                DECLARE old_json TEXT;
                DECLARE changed TEXT;
                DECLARE logId VARCHAR(36);

                DECLARE current_user_id VARCHAR(255);
                DECLARE current_user_ip VARCHAR(255);
                SET current_user_id = IFNULL(@user_id, 'unknown');
                SET current_user_ip = IFNULL(@user_ip, '0.0.0.0');

                SET fields = "${params.fields}";
                SET old_row = "";
                SET new_row = CONCAT_WS(",", ${params.newFields});
                
                SET new_json = generate_changed_json("", new_row, fields);
                SET old_json = "{}";
                SET changed = generate_changed_json(old_row, new_row, fields);

                SET logId = uuid_v4();
                
                ${
                  this.enableTriggerDebugLog
                    ? `INSERT INTO trigger_debug_log (trigger_event, old_row_data, new_row_data, fields_data, changed_output, old_json_output, new_json_output)
                VALUES ('CREATE_${params.tableName}', old_row, new_row, fields, changed, old_json, new_json);`
                    : ''
                }

                INSERT INTO  ${params.auditLogTable} (id, log_type, ip_address, user_id) 
                        VALUES (logId, 'ENTITY', current_user_ip, current_user_id);
                
                INSERT INTO ${params.auditLogDetailTable} (log_id, id, action, entity, entity_pk, changed_values, \`before_change\`, after_change, table_schema) 
                        VALUES (logId, uuid_v4(), 'CREATE', '${params.tableName}', '${params.entityPk}', changed, old_json, new_json, get_table_schema('${params.tableName}'));
            END;
        `;
  }

  private templateUpdateTrigger(schema: InformationSchemaType) {
    const NULL_MARKER = '@@MYSQL_AUDIT_NULL@@';
    const params = {
      tableName: schema.table,
      fields: schema.fields.join(', '),
      newFields: schema.fields
        .map((f) => `IFNULL(NEW.${f}, '${NULL_MARKER}')`)
        .join(', '),
      oldFields: schema.fields
        .map((f) => `IFNULL(OLD.${f}, '${NULL_MARKER}')`)
        .join(', '),
      auditLogTable: this.auditLogTable,
      auditLogDetailTable: this.auditLogDetailTable,
      entityPk: `${schema.pk.join('+')}`,
    };
    return `
            CREATE TRIGGER audit_log_update_${params.tableName}
            BEFORE UPDATE ON ${params.tableName}
            FOR EACH ROW
            BEGIN
                DECLARE fields TEXT;
                DECLARE old_row TEXT;
                DECLARE new_row TEXT;
                DECLARE new_json TEXT;
                DECLARE old_json TEXT;
                DECLARE changed TEXT;
                DECLARE logId VARCHAR(36);
                
                DECLARE current_user_id VARCHAR(255);
                DECLARE current_user_ip VARCHAR(255);
                SET current_user_id = IFNULL(@user_id, 'unknown');
                SET current_user_ip = IFNULL(@user_ip, '0.0.0.0');

                SET fields = "${params.fields}";
                SET old_row = CONCAT_WS(",", ${params.oldFields});
                SET new_row = CONCAT_WS(",", ${params.newFields});
                
                SET new_json = generate_changed_json("", new_row, fields);
                SET old_json = generate_changed_json("", old_row, fields);
                SET changed = generate_changed_json(old_row, new_row, fields);

                IF changed != '{}' THEN
                    SET logId = uuid_v4();

                    ${
                      this.enableTriggerDebugLog
                        ? `INSERT INTO trigger_debug_log (trigger_event, old_row_data, new_row_data, fields_data, changed_output, old_json_output, new_json_output)
                    VALUES ('UPDATE_${params.tableName}', old_row, new_row, fields, changed, old_json, new_json);`
                        : ''
                    }

                    INSERT INTO  ${params.auditLogTable} (id, log_type, ip_address, user_id) 
                            VALUES (logId, 'ENTITY', current_user_ip, current_user_id);
                    

                    INSERT INTO ${params.auditLogDetailTable} (log_id, id, action, entity, entity_pk, changed_values, \`before_change\`, after_change, table_schema) 
                            VALUES (logId, uuid_v4(), 'UPDATE', '${params.tableName}', '${params.entityPk}', changed, old_json, new_json, get_table_schema('${params.tableName}'));
                END IF;
            END;
        `;
  }

  private baseScripts(name: string) {
    const NULL_MARKER = '@@MYSQL_AUDIT_NULL@@';
    switch (name) {
      case 'generate_changed_json':
        return `CREATE FUNCTION generate_changed_json(
                    old_row TEXT,
                    new_row TEXT,
                    fields TEXT
                ) RETURNS TEXT
                BEGIN
                    DECLARE changed TEXT DEFAULT '';
                    DECLARE i INT DEFAULT 1;
                    DECLARE field_name TEXT;
                    DECLARE old_value TEXT;
                    DECLARE new_value TEXT;
                    DECLARE field_count INT;
                    DECLARE prefix TEXT DEFAULT '';
                    DECLARE escaped_new_value TEXT;
        
                    SET field_count = LENGTH(fields) - LENGTH(REPLACE(fields, ',', '')) + 1;
        
                    WHILE i <= field_count DO
                        SET field_name = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(fields, ',', i), ',', -1));
                        SET old_value = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(old_row, ',', i), ',', -1));
                        SET new_value = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(new_row, ',', i), ',', -1));
        
                        IF BINARY old_value != BINARY new_value THEN
                            IF new_value = '${NULL_MARKER}' THEN
                                SET changed = CONCAT(changed, prefix, '"', field_name, '": null');
                            ELSE
                                SET escaped_new_value = REPLACE(REPLACE(new_value, '\\\\', '\\\\\\\\'), '"', '\\\\"');
                                SET changed = CONCAT(changed, prefix, '"', field_name, '": "', escaped_new_value, '"');
                            END IF;
                            SET prefix = ', ';
                        END IF;
        
                        SET i = i + 1;
                    END WHILE;
        
                    IF changed = '' THEN
                        RETURN '{}';
                    ELSE
                        RETURN CONCAT('{', changed, '}');
                    END IF;
                END;`;
      case 'get_table_schema':
        return `CREATE FUNCTION get_table_schema(tb_name VARCHAR(255))
                RETURNS TEXT
                DETERMINISTIC
                READS SQL DATA
                BEGIN
                    DECLARE result TEXT DEFAULT '{';
                    DECLARE col_name VARCHAR(255);
                    DECLARE col_type VARCHAR(255);
                    DECLARE is_nullable VARCHAR(3);
                    DECLARE col_key VARCHAR(3);
                    DECLARE done INT DEFAULT FALSE;
                    
                    DECLARE column_cursor CURSOR FOR
                    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
                    FROM information_schema.columns
                    WHERE UPPER(table_name) = UPPER(tb_name) AND table_schema = DATABASE();
                
                    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
                
                    OPEN column_cursor;
                
                    column_loop: LOOP
                        FETCH column_cursor INTO col_name, col_type, is_nullable, col_key;
                
                        IF done THEN
                            LEAVE column_loop;
                        END IF;
                
                        SET result = CONCAT(result, '"', col_name, '": { "type": "', col_type, '"');
                
                        IF is_nullable = 'NO' THEN
                            SET result = CONCAT(result, ', "required": true');
                        ELSE
                            SET result = CONCAT(result, ', "required": false');
                        END IF;
                
                        IF col_key = 'PRI' THEN
                            SET result = CONCAT(result, ', "primary_key": true');
                        ELSE
                            SET result = CONCAT(result, ', "primary_key": false');
                        END IF;
                
                        SET result = CONCAT(result, ' }, ');
                    END LOOP;
                
                    CLOSE column_cursor;
                
                    SET result = CONCAT(LEFT(result, LENGTH(result) - 2), '}');
                
                    RETURN result;
                END`;
      case 'uuid_v4':
        return `CREATE FUNCTION uuid_v4()
                    RETURNS CHAR(36) NO SQL
                BEGIN
                    SET @h1 = LPAD(HEX(FLOOR(RAND() * 0xffff)), 4, '0');
                    SET @h2 = LPAD(HEX(FLOOR(RAND() * 0xffff)), 4, '0');
                    SET @h3 = LPAD(HEX(FLOOR(RAND() * 0xffff)), 4, '0');
                    SET @h6 = LPAD(HEX(FLOOR(RAND() * 0xffff)), 4, '0');
                    SET @h7 = LPAD(HEX(FLOOR(RAND() * 0xffff)), 4, '0');
                    SET @h8 = LPAD(HEX(FLOOR(RAND() * 0xffff)), 4, '0');

                    SET @h4 = CONCAT('4', LPAD(HEX(FLOOR(RAND() * 0x0fff)), 3, '0'));

                    SET @h5 = CONCAT(HEX(FLOOR(RAND() * 4 + 8)),
                                LPAD(HEX(FLOOR(RAND() * 0x0fff)), 3, '0'));

                    RETURN LOWER(CONCAT(
                        @h1, @h2, '-', @h3, '-', @h4, '-', @h5, '-', @h6, @h7, @h8
                    ));
                END;`;
      default:
        return '-- Script not found';
    }
  }
}
