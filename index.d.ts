declare module 'node-bitstamp' {
  export enum BitstampTradeType {
    buy = '0',
    sell = '1',
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

  export interface IBitstampLimitOrder {
    id: string
    datetime: Date
    type: BitstampTradeType
    price: number
    amount: number
  }

  export interface IBitstampLimitOrderInvalid {
    status: number
    reason: string
  }

  export interface BalanceResponseInvalid {
    error: string // error / OK
    reason: string // API key not found
    code: string // API0001
  }

  interface BitstampNodeRespose {
    status: number
    headers: {}
    body: string
  }

  export class Bitstamp {
    constructor(options: IBitstampOptions)

    ticker(currency?: CURRENCY): Promise<any>
    ohlcData(
      currency?: CURRENCY,
      start?: number,
      end?: number,
      step?: number,
      limit?: number
    ): Promise<any>

    orderBook(currency?: CURRENCY): Promise<{ status: number; headers: {}; body: IBitstampOrderbook }>

    balance(): Promise<BalanceResponseInvalid | any>

    // amount is quantity, price is per unit
    buyLimitOrder(
      amount: number,
      price: number,
      currency: CURRENCY,
      limit_price?: number,
      daily_order?: boolean,
    ): Promise<BitstampNodeRespose> // | IBitstampLimitOrderInvalid>

    // amount is quantity, price is per unit
    sellLimitOrder(
      amount: number,
      price: number,
      currency: CURRENCY,
      limit_price?: number,
      daily_order?: boolean,
    ): Promise<BitstampNodeRespose> //  | IBitstampLimitOrderInvalid>

    transactions(currency?: CURRENCY, time?: string): Promise<any>
    cryptoTransactions(currency?: CURRENCY, time?: string): Promise<any>
    close()
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
}
