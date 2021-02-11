declare module 'node-bitstamp' {
  export enum BitstampTradeType {
    buy = '0',
    sell = '1',
  }

  export enum BitstampOrderStatus {
    OPEN = 'Open',
    FINSIHED = 'Finished',
    CANCELLED = 'Canceled'
  }

  export enum BitstampWithdrawalType {
    SEPA = 0,
    WIRE_TRANSFER = 2,
    BTC = 1,
    XRP = 14,
    LTC = 15,
    ETH = 16,
    BCH = 17,
    XLM = 19,
    PAX = 18,
    LINK = 20,
    OMG = 21,
    USDC = 22
  }

  export interface IBitstampOptions {
    key: string
    secret: string
    clientId: string
    timeout: number
    rateLimit: boolean
  }

  export interface IBitstampOrderbook {
    timestamp: Date
    bids: string[][]
    asks: string[][]
  }

  export interface IBitstampOrder {
    id: number
    datetime: Date
    type: BitstampTradeType
    price: number
    amount: number
  }

  export interface IBitstampCancelledOrder {
    id: number
    datetime: Date
    price: number
    amount: number
  }

  export interface IBitstampTransaction {
    fee: string
    price: string
    datetime: Date
    btc: string
    tid: number
    type: BitstampTradeType
    eur: string
  }

  export interface IBitstampOrderStatus {
    status: BitstampOrderStatus
    id: number
    amount_remaining: string
    transactions: Array<IBitstampTransaction>
  }

  export interface IBitstampTicker {
    high: string
    last: string
    timestamp: string
    bid: string
    vwap: string
    volume: string
    low: string
    ask: string
    open: string
  }

  export interface IBitstampWithdrawal {
    id: number
    datetime: Date
    type: BitstampWithdrawalType
    currency: CURRENCY
    amount: string
    address?: string
    transaction_id?: string
  }

  export interface IBitstampUnconfirmedBtcDeposit {
    amount: string
    address: string
    confirmations: number
  }

  export interface IBitstampBankWithdrawal {
    amount: string
    account_currency: FIAT_CURRENCY
    name: string
    iban: string
    bid: string
    address: string
    postal_code: string,
    city: string,
    country: string,
    type: string,
    bank_name?: string
    bank_address?: string
    bank_postal_code?: string
    bank_city?: string,
    bank_country?: string
    currency?: string
    comment?: string
  }

  export interface IBitstampCancelledBankWithdrawal {
    amount: string
    currency: FIAT_CURRENCY
    type: string
  }

  export interface IBitstampLiquidationAddressInfo {
    address: string
    currency_pair: string
    transactions: Array<IBitstampLiquidationTransaction>
  }

  export interface IBitstampLiquidationTransaction {
    order_id: number,
    count: number,
    trades: Array<IBitstampLiquidationTrade>
  }

  export interface IBitstampLiquidationTrade {
    exchange_rate: string,
    btc_amount: string,
    fees: string
  }

  export interface BitstampNodeResponse<ResponseType> {
    status: number
    headers: object
    body: ResponseType
  }

  export class Bitstamp {
    constructor(options: IBitstampOptions)

    ticker(currency?: CURRENCY): Promise<BitstampNodeResponse<IBitstampTicker>>
    orderBook(currency?: CURRENCY): Promise<BitstampNodeResponse<IBitstampOrderbook>>
    balance(): Promise<BitstampNodeResponse<IBitstampBalanceResponse>>
    transactions(currency?: CURRENCY, time?: string): Promise<BitstampNodeResponse<Array<IBitstampTransaction>>>

    openOrders(currency?: CURRENCY): Promise<BitstampNodeResponse<Array<IBitstampOrder>>>
    openOrdersAll(): Promise<BitstampNodeResponse<Array<IBitstampOrder>>>
    orderStatus(id: number): Promise<BitstampNodeResponse<IBitstampOrderStatus>>;
    cancelOrder(id: number): Promise<BitstampNodeResponse<IBitstampCancelledOrder>>
    cancelOrdersAll(): Promise<BitstampNodeResponse<boolean>>

    // amount is quantity, price is per unit
    buyLimitOrder(
        amount: number,
        price: number,
        currency: CURRENCY,
        limit_price?: number,
        daily_order?: boolean,
    ): Promise<BitstampNodeResponse<IBitstampOrder>>
    buyMarketOrder(amount: number, currency: CURRENCY): Promise<BitstampNodeResponse<IBitstampOrder>>
    buyInstantOrder(amount: number, currency: CURRENCY): Promise<BitstampNodeResponse<IBitstampOrder>>

    // amount is quantity, price is per unit
    sellLimitOrder(
        amount: number,
        price: number,
        currency: CURRENCY,
        limit_price?: number,
        daily_order?: boolean,
    ): Promise<BitstampNodeResponse<IBitstampOrder>>
    sellMarketOrder(amount: number, currency: CURRENCY): Promise<BitstampNodeResponse<IBitstampOrder>>
    sellInstantOrder(amount: number, currency: CURRENCY): Promise<BitstampNodeResponse<IBitstampOrder>>

    withDrawalRequests(timedelta?: number): Promise<BitstampNodeResponse<IBitstampWithdrawal>>

    bitcoinWithdrawal(amount: number, address: string, instant: number): Promise<BitstampNodeResponse<number>>
    litecoinWithdrawal(amount: number, address: string): Promise<BitstampNodeResponse<number>>
    ethereumWithdrawal(amount: number, address: string): Promise<BitstampNodeResponse<number>>
    // FIME: Create an enum for ripple currency (as I have no idea what values are expected here...)
    rippleWithdrawal(amount: number, address: string, currency: any): Promise<BitstampNodeResponse<boolean>>
    xrpWithdrawal(amount: number, address: string, destination_address: number): Promise<BitstampNodeResponse<number>>
    bchWithdrawal(amount: number, address: string): Promise<BitstampNodeResponse<number>>

    ethereumDepositAdress(): Promise<BitstampNodeResponse<string>>
    xrpDepositAdress(): Promise<BitstampNodeResponse<string>>
    litecoinDepositAdress(): Promise<BitstampNodeResponse<string>>
    bitcoinDepositAdress(): Promise<BitstampNodeResponse<string>>
    bchDepositAdress(): Promise<BitstampNodeResponse<string>>
    rippleDepositAdress(): Promise<BitstampNodeResponse<string>>

    unconfirmedBitcoinDeposits(): Promise<BitstampNodeResponse<IBitstampUnconfirmedBtcDeposit>>

    transferSubToMain(amount: number, currency: string, subAccount?: string): Promise<BitstampNodeResponse<string>>
    transferMainToSub(amount: number, currency: string, subAccount?: string): Promise<BitstampNodeResponse<string>>

    openBankWithdrawal(body: IBitstampBankWithdrawal): Promise<BitstampNodeResponse<number>>
    bankWithdrawalStatus(id: number): Promise<BitstampNodeResponse<string>>
    cancelBankWithdrawal(id: number): Promise<BitstampNodeResponse<string>>

    newLiquidationAddress(liquidation_currency): Promise<BitstampNodeResponse<string>>
    liquidationAddressInfo(address): Promise<BitstampNodeResponse<IBitstampLiquidationAddressInfo>>

    close(): void
  }

  export enum FIAT_CURRENCY {
    USD = 'USD',
    EUR = 'EUR',
    GBP = 'GBP',
  }

  export enum CURRENCY {
    BTC_EUR,
    EUR_USD,
    XRP_USD,
    XRP_EUR,
    XRP_BTC,
    LTC_USD,
    LTC_EUR,
    LTC_BTC,
    ETH_USD,
    ETH_EUR,
    ETH_BTC,
  }

  export interface IBitstampBalanceResponse {
    bch_available: string,
    bch_balance: string,
    bch_reserved: string,
    bch_withdrawal_fee: string,
    bchbtc_fee: string,
    bcheur_fee: string,
    bchgbp_fee: string,
    bchusd_fee: string,
    btc_available: string,
    btc_balance: string,
    btc_reserved: string,
    btc_withdrawal_fee: string,
    btceur_fee: string,
    btcgbp_fee: string,
    btcpax_fee: string,
    btcusd_fee: string,
    btcusdc_fee: string,
    eth_available: string,
    eth_balance: string,
    eth_reserved: string,
    eth_withdrawal_fee: string,
    ethbtc_fee: string,
    etheur_fee: string,
    ethgbp_fee: string,
    ethpax_fee: string,
    ethusd_fee: string,
    ethusdc_fee: string,
    eur_available: string,
    eur_balance: string,
    eur_reserved: string,
    eurusd_fee: string,
    gbp_available: string,
    gbp_balance: string,
    gbp_reserved: string,
    gbpeur_fee: string,
    gbpusd_fee: string,
    link_available: string,
    link_balance: string,
    link_reserved: string,
    link_withdrawal_fee: string,
    linkbtc_fee: string,
    linketh_fee: string,
    linkeur_fee: string,
    linkgbp_fee: string,
    linkusd_fee: string,
    ltc_available: string,
    ltc_balance: string,
    ltc_reserved: string,
    ltc_withdrawal_fee: string,
    ltcbtc_fee: string,
    ltceur_fee: string,
    ltcgbp_fee: string,
    ltcusd_fee: string,
    omg_available: string,
    omg_balance: string,
    omg_reserved: string,
    omg_withdrawal_fee: string,
    omgbtc_fee: string,
    omgeur_fee: string,
    omggbp_fee: string,
    omgusd_fee: string,
    pax_available: string,
    pax_balance: string,
    pax_reserved: string,
    pax_withdrawal_fee: string,
    paxeur_fee: string,
    paxgbp_fee: string,
    paxusd_fee: string,
    usd_available: string,
    usd_balance: string,
    usd_reserved: string,
    usdc_available: string,
    usdc_balance: string,
    usdc_reserved: string,
    usdc_withdrawal_fee: string,
    usdceur_fee: string,
    usdcusd_fee: string,
    xlm_available: string,
    xlm_balance: string,
    xlm_reserved: string,
    xlm_withdrawal_fee: string,
    xlmbtc_fee: string,
    xlmeur_fee: string,
    xlmgbp_fee: string,
    xlmusd_fee: string,
    xrp_available: string,
    xrp_balance: string,
    xrp_reserved: string,
    xrp_withdrawal_fee: string,
    xrpbtc_fee: string,
    xrpeur_fee: string,
    xrpgbp_fee: string,
    xrppax_fee: string,
    xrpusd_fee: string,
  }
}
