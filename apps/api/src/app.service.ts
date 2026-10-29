import { Injectable } from '@nestjs/common';
import { CURRENCY } from '@rental/shared';

@Injectable()
export class AppService {
  getHello(): string {
    return `Hello World! (${CURRENCY})`;
  }
}
