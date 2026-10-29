import { Body, Controller, INestApplication, Param, Post, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsInt, IsString, Min } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { Public } from './../src/auth/public.decorator.js';

// Test-only endpoint to exercise the global ValidationPipe.
class EchoDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  value: number;
}

// Public: these tests are about validation, not the global auth guard.
@Public()
@Controller('echo')
class EchoController {
  @Post(':id')
  echo(@Param('id') id: number, @Body() body: EchoDto) {
    return { id, idType: typeof id, isDto: body instanceof EchoDto, body };
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [EchoController],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Keep in sync with the ValidationPipe options in src/main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World! (UAH)');
  });

  describe('validation', () => {
    it('accepts a valid body and transforms params and payload', () => {
      return request(app.getHttpServer())
        .post('/echo/5')
        .send({ name: 'gas', value: 42 })
        .expect(201)
        .expect({ id: 5, idType: 'number', isDto: true, body: { name: 'gas', value: 42 } });
    });

    it('rejects a wrong-typed field', () => {
      return request(app.getHttpServer())
        .post('/echo/5')
        .send({ name: 'gas', value: 'lots' })
        .expect(400);
    });

    it('rejects a missing field', () => {
      return request(app.getHttpServer()).post('/echo/5').send({ name: 'gas' }).expect(400);
    });

    it('rejects unknown fields', () => {
      return request(app.getHttpServer())
        .post('/echo/5')
        .send({ name: 'gas', value: 1, admin: true })
        .expect(400);
    });
  });
});
