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

  it('creates a checkout preference and returns only safe fields', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'pref_123',
          init_point: 'https://www.mercadopago.com/init/pref_123',
          sandbox_init_point: 'https://sandbox.mercadopago.com/init/pref_123',
          collector_id: 9999,
        }),
        { status: 201 },
      ),
    );

    const result = await client.createCheckoutProPreference(
      {
        accessToken: 'APP_USR-12345678901234567890',
        environment: 'test',
      },
      {
        title: 'BJJ Ops billing charge',
        externalReference: 'billing_charge:charge_1',
        currency: 'ARS',
        amount: 100,
      },
    );

    expect(result).toEqual({
      preferenceId: 'pref_123',
      initPoint: 'https://www.mercadopago.com/init/pref_123',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_123',
      environment: 'test',
    });
    expect(JSON.stringify(result)).not.toContain('collector_id');
    expect(JSON.stringify(result)).not.toContain('APP_USR');
  });

  it('normalizes checkout preference failures without exposing provider payloads', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'bad_request' }), {
        status: 400,
      }),
    );

    await expect(
      client.createCheckoutProPreference(
        {
          accessToken: 'APP_USR-12345678901234567890',
          environment: 'test',
        },
        {
          title: 'BJJ Ops billing charge',
          externalReference: 'billing_charge:charge_1',
          currency: 'ARS',
          amount: 100,
        },
      ),
    ).rejects.toThrow(
      'Mercado Pago rejected the checkout preference payload',
    );
  });

  it('fetches a payment resource and returns only normalized fields', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 2798247250,
          external_reference: 'billing_charge:charge_1',
          status: 'approved',
          status_detail: 'accredited',
          transaction_amount: 100,
          currency_id: 'ARS',
          live_mode: true,
          card: {
            first_six_digits: '450995',
          },
        }),
        { status: 200 },
      ),
    );

    const result = await client.getPaymentById(
      {
        accessToken: 'APP_USR-12345678901234567890',
        webhookSecret: 'secret_123',
        environment: 'test',
      },
      '2798247250',
    );

    expect(result).toEqual({
      id: '2798247250',
      externalReference: 'billing_charge:charge_1',
      status: 'approved',
      statusDetail: 'accredited',
      transactionAmount: 100,
      currency: 'ARS',
      liveMode: true,
      dateCreated: undefined,
      dateApproved: undefined,
      dateLastUpdated: undefined,
    });
    expect(JSON.stringify(result)).not.toContain('first_six_digits');
  });
});
