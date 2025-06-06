import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { initializeSoapClientUtils } from '../utils/soap-client.utils';

@Injectable()
export class SoapClientUtilsProvider implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    initializeSoapClientUtils(this.moduleRef);
  }
}
