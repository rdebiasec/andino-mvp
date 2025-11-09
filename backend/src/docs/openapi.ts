import swaggerJSDoc from 'swagger-jsdoc';

import { env } from '../config/env.js';

const exampleResponse = {
  intent: 'soporte_tecnico',
  category: 'servicio',
  tone: 'frustrado',
  confidence: 0.83,
  caseId: 'AND-20251108-04217',
  receivedAt: '2025-11-08T15:04:05.000Z',
  channel: 'web',
  crm: {
    status: 'REGISTERED',
    existingOpenCaseId: null,
    isCustomer: true
  }
};

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Andino Postventa API',
    description: 'PoC API para clasificación automática de reclamos con OpenAI.',
    version: '0.1.0'
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Desarrollo local'
    }
  ],
  components: {
    schemas: {
      ClassifyRequest: {
        type: 'object',
        required: ['text'],
        properties: {
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 2000,
            example: 'Necesito cancelar mi pedido porque llegó defectuoso.'
          },
          channel: {
            type: 'string',
            enum: ['web', 'whatsapp', 'email'],
            example: 'web'
          }
        }
      },
      ClassifyResponse: {
        type: 'object',
        required: [
          'intent',
          'category',
          'tone',
          'confidence',
          'caseId',
          'receivedAt',
          'channel',
          'crm'
        ],
        properties: {
          intent: {
            type: 'string',
            enum: ['cancelacion', 'devolucion', 'soporte_tecnico', 'facturacion', 'otro']
          },
          category: {
            type: 'string',
            enum: ['producto', 'servicio', 'logistica', 'pago', 'otro']
          },
          tone: {
            type: 'string',
            enum: ['enojado', 'neutral', 'frustrado', 'positivo', 'urgente']
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          caseId: {
            type: 'string'
          },
          receivedAt: {
            type: 'string',
            format: 'date-time'
          },
          channel: {
            type: 'string'
          },
          crm: {
            type: 'object',
            required: ['status', 'existingOpenCaseId', 'isCustomer'],
            properties: {
              status: {
                type: 'string',
                enum: ['REGISTERED', 'DUPLICATE_FOUND']
              },
              existingOpenCaseId: {
                oneOf: [
                  { type: 'string' },
                  { type: 'null' }
                ]
              },
              isCustomer: {
                type: 'boolean'
              }
            }
          },
          rawModelOutput: {
            type: 'object',
            description: 'Solo disponible en entornos no productivos',
            additionalProperties: true
          }
        },
        example: exampleResponse
      },
      CaseListResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                caseId: { type: 'string' },
                text: { type: 'string' },
                channel: { type: 'string' },
                intent: { type: 'string' },
                category: { type: 'string' },
                tone: { type: 'string' },
                confidence: { type: 'number' },
                receivedAt: { type: 'string', format: 'date-time' },
                crmStatus: { type: 'string' },
                crmExistingOpenCaseId: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'null' }
                  ]
                },
                isCustomer: { type: 'boolean' }
              }
            }
          },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' }
        }
      }
    }
  },
  paths: {
    '/api/v1/health': {
      get: {
        summary: 'Health check',
        responses: {
          200: {
            description: 'Estado del servicio',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number' },
                    version: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/classify': {
      post: {
        summary: 'Clasifica un reclamo de cliente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ClassifyRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Clasificación generada',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ClassifyResponse'
                }
              }
            }
          },
          400: {
            description: 'Error de validación',
            content: {
              'application/problem+json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    title: { type: 'string' },
                    status: { type: 'integer' },
                    detail: { type: 'string' },
                    traceId: { type: 'string' },
                    errors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          path: { type: 'string' },
                          message: { type: 'string' },
                          code: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          500: {
            description: 'Error interno',
            content: {
              'application/problem+json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    title: { type: 'string' },
                    status: { type: 'integer' },
                    detail: { type: 'string' },
                    traceId: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/cases': {
      get: {
        summary: 'Obtiene casos registrados en memoria',
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: {
              type: 'integer',
              minimum: 1,
              example: 1
            }
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 20
            }
          }
        ],
        responses: {
          200: {
            description: 'Casos almacenados',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CaseListResponse'
                }
              }
            }
          }
        }
      }
    }
  }
};

export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: []
});

export const swaggerUiOptions = {
  explorer: false,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Andino Postventa API Docs'
};

export const docsConfig = {
  swaggerSpec,
  swaggerUiOptions,
  serveDocs: env.nodeEnv !== 'test'
};
