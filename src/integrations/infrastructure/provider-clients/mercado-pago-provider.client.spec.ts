import { MercadoPagoProviderClient } from './mercado-pago-provider.client';

describe('MercadoPagoProviderClient', () => {
  let client: MercadoPagoProviderClient;

  beforeEach(() => {
    client = new MercadoPagoProviderClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a safe succeeded result when Mercado Pago validates the token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 123456,
          nickname: 'TESTSELLER',
          site_id: 'MLA',
          country_id: 'AR',
          email: 'seller@test.local',
        }),
        { status: 200 },
      ),
    );

    const result = await client.testConnection({
      accessToken: 'APP_USR-12345678901234567890',
      environment: 'test',
    });

    expect(result.status).toBe('SUCCEEDED');
    expect(result.summaryJson).toEqual(
      expect.objectContaining({
        provider: 'MERCADO_PAGO',
        environment: 'test',
        account: expect.objectContaining({
          userId: '123456',
          nickname: 'TESTSELLER',
          siteId: 'MLA',
          countryId: 'AR',
        }),
      }),
    );
    expect(JSON.stringify(result.summaryJson)).not.toContain('email');
  });

  it('normalizes auth failures without exposing secrets', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'invalid_token' }), {
        status: 401,
      }),
    );

    const result = await client.testConnection({
      accessToken: 'APP_USR-12345678901234567890',
      environment: 'test',
    });

    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toBe(
      'Mercado Pago rejected the access token',
    );
  });
});
