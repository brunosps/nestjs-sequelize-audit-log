/**
 * Utilitário para sanitizar payloads removendo informações sensíveis
 */

export interface SanitizeOptions {
  maxLength?: number;
  sensitiveFields?: string[];
  removeCircularReferences?: boolean;
  removeUndefined?: boolean;
}

const DEFAULT_SENSITIVE_FIELDS = [
  'confirmationPassword',
  'adminPassword',
  'newPassword',
  'password',
  'senha',
  'ssn',
  'token',
  'authorization',
  'auth',
  'secret',
  'key',
  'private',
  'credential',
  'cpf',
  'rg',
  'cnpj',
  'creditCardNumber',
  'numeroCartaoCredito',
  'bankAccount',
  'contaBancaria',
  'routingNumber',
  'numeroAgencia',
  'address',
  'endereco',
  'phoneNumber',
  'email',
  'phone',
  'telefone',
  'birthdate',
  'dataNascimento',
  'motherName',
  'nomeMae',
  'fatherName',
  'nomePai',
  'passportNumber',
  'numeroPassaporte',
  'driverLicense',
  'cnh',
  'biometricData',
  'dadosBiometricos',
  'healthData',
  'dadosSaude',
  'geneticData',
  'dadosGeneticos',
  'ethnicity',
  'etnia',
  'religion',
  'religiao',
  'politicalAffiliation',
  'afiliacaoPolitica',
  'sexualOrientation',
  'orientacaoSexual',
  'geolocation',
  'geolocalizacao',
  'ipAddress',
  'enderecoIP',
  'macAddress',
  'enderecoMAC',
  'income',
  'renda',
  'maritalStatus',
  'estadoCivil',
  'socialSecurityNumber',
  'numeroPrevidenciaSocial',
  'educationLevel',
  'nivelEscolaridade',
  'employmentHistory',
  'historicoEmpregos',
  'criminalRecord',
  'antecedentesCriminais',
  'financialData',
  'dadosFinanceiros',
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
];

export function sanitizePayload(
  payload: any,
  options: SanitizeOptions = {},
): string {
  const {
    maxLength = 10000,
    sensitiveFields = DEFAULT_SENSITIVE_FIELDS,
    removeCircularReferences = true,
    removeUndefined = true,
  } = options;

  try {
    if (payload === null || payload === undefined) {
      return '';
    }

    if (typeof payload === 'string') {
      return payload.length > maxLength
        ? payload.substring(0, maxLength) + '...'
        : payload;
    }

    if (typeof payload !== 'object') {
      return String(payload);
    }

    let sanitized = removeCircularReferences
      ? removeCircularRefs(payload)
      : { ...payload };

    sanitized = removeSensitiveFields(sanitized, sensitiveFields);

    if (removeUndefined) {
      sanitized = removeUndefinedFields(sanitized);
    }

    let jsonString = JSON.stringify(sanitized, null, 2);

    if (jsonString.length > maxLength) {
      jsonString = jsonString.substring(0, maxLength) + '...';
    }

    return jsonString;
  } catch (error) {
    console.warn('Erro ao sanitizar payload:', error);
    return '[Erro ao processar payload]';
  }
}

function removeCircularRefs(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return '[Circular Reference]';
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => removeCircularRefs(item, seen));
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = removeCircularRefs(value, seen);
  }

  seen.delete(obj);
  return cleaned;
}

function removeSensitiveFields(obj: any, sensitiveFields: string[]): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeSensitiveFields(item, sensitiveFields));
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    const isSensitive = sensitiveFields.some((field) =>
      lowerKey.includes(field.toLowerCase()),
    );

    if (isSensitive) {
      cleaned[key] = '[REDACTED]';
    } else {
      cleaned[key] = removeSensitiveFields(value, sensitiveFields);
    }
  }

  return cleaned;
}

function removeUndefinedFields(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedFields(item));
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefinedFields(value);
    }
  }

  return cleaned;
}

export function sanitizeXmlPayload(
  xmlString: string,
  maxLength = 50000,
): string {
  try {
    if (!xmlString || typeof xmlString !== 'string') {
      return '';
    }

    let sanitized = xmlString;

    const sensitiveXmlPatterns = [
      /<([^>]*(?:password|senha|token|auth|secret|key)[^>]*)>([^<]*)<\/[^>]*>/gi,
      /<([^>]*(?:cpf|cnpj|credit|card)[^>]*)>([^<]*)<\/[^>]*>/gi,
    ];

    sensitiveXmlPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '<$1>[REDACTED]</$1>');
    });

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  } catch (error) {
    console.warn('Erro ao sanitizar XML payload:', error);
    return '[Erro ao processar XML payload]';
  }
}
