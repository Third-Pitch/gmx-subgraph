import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

// must be lower
export let WETH = "0x4200000000000000000000000000000000000006"
export let BTC = "0x5fe699663197083711137060e3774b9ecdee16d2"
export let LINK = "0x1ef0a4cd5cd4cd23d3dffb8ec657d92206b11005"
export let USDT = "0xdcd63e6142a900dc1e1780595b2d165c6459104e"
export let USDC = "0x4f526361313618a87e952720f3ef5b44dcd7c9c3"
export let DAI = "0xaa23a4d90a50a06e171d32ee75897cdca4bc3f51"
export let EDDX = "0x9fd329310b43d00aaf050518200732ac45f34dc5"

export function timestampToDay(timestamp: BigInt): BigInt {
  return timestamp / BigInt.fromI32(86400) * BigInt.fromI32(86400)
}

export function timestampToPeriod(timestamp: BigInt, period: string): BigInt {
  let periodTime: BigInt

  if (period == "daily") {
    periodTime = BigInt.fromI32(86400)
  } else if (period == "hourly") {
    periodTime = BigInt.fromI32(3600)
  } else if (period == "weekly" ){
    periodTime = BigInt.fromI32(86400 * 7)
  } else {
    throw new Error("Unsupported period " + period)
  }

  return timestamp / periodTime * periodTime
}


export function getTokenDecimals(token: String): u8 {
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(WETH, 18)
  tokenDecimals.set(BTC, 18)
  tokenDecimals.set(LINK, 18)
  tokenDecimals.set(USDC, 18)
  tokenDecimals.set(USDT, 18)
  tokenDecimals.set(DAI, 18)
  tokenDecimals.set(EDDX, 18)

  return tokenDecimals.get(token) as u8
}

export function getTokenAmountUsd(token: String, amount: BigInt): BigInt {
  let decimals = getTokenDecimals(token)
  let denominator = BigInt.fromI32(10).pow(decimals)
  let price = getTokenPrice(token)
  return amount * price / denominator
}

export function getTokenPrice(token: String): BigInt {
  if (token != EDDX) {
    let chainlinkPriceEntity = ChainlinkPrice.load(token)
    if (chainlinkPriceEntity != null) {
      // all chainlink prices have 8 decimals
      // adjusting them to fit EDDX 30 decimals USD values
      return chainlinkPriceEntity.value * BigInt.fromI32(10).pow(22)
    }
  }

  if (token == EDDX) {
    let uniswapPriceEntity = UniswapPrice.load(EDDX)

    if (uniswapPriceEntity != null) {
      return uniswapPriceEntity.value
    }
  }

  let prices = new TypedMap<String, BigInt>()
  prices.set(WETH, BigInt.fromI32(3350) * PRECISION)
  prices.set(BTC, BigInt.fromI32(45000) * PRECISION)
  prices.set(LINK, BigInt.fromI32(25) * PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(USDT, PRECISION)
  prices.set(DAI, PRECISION)
  prices.set(EDDX, BigInt.fromI32(30) * PRECISION)

  return prices.get(token) as BigInt
}
