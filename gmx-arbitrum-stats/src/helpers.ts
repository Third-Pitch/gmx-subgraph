import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

// must be lower
export let WETH = "0x4200000000000000000000000000000000000006"
export let BTC = "0x1acf131de5bbc72ae96ee5ec7b59da2f38b19dbd"
export let LINK = "0x63ba205da17003ab46ce0dd78be8ba8ee3952e5f"
export let USDT = "0x8654f060eb1e5533c259cdcbbe39834bb8141cf4"
export let USDC = "0xecb03bbcf83e863b9053a926932dbb07d837ebbe"
export let DAI = "0xfe9cdcc77fb826b380d49f53c8ce298b600cb7f0"
export let EDDX = "0x24b63ae170152fccf6a11cd77ffa2d7f04ed999d"

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
