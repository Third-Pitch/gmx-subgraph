import { BigInt, ethereum, store } from "@graphprotocol/graph-ts"
import * as vault from "../generated/Vault/Vault"
import * as positionRouter from "../generated/PositionRouter/PositionRouter"
import * as elpManager from "../generated/ElpManager/ElpManager"
import * as rewardRouter from "../generated/RewardRouterV2/RewardRouterV2"
import {
  CollectMarginFee,
  CollectSwapFee,
  AddLiquidity,
  RemoveLiquidity,
  IncreasePosition,
  DecreasePosition,
  LiquidatePosition,
  ClosePosition,
  UpdatePosition,
  Transaction,
  Swap,
  StakeEddx,
  UnstakeEddx,
  StakeElp,
  UnstakeElp,
  CreateIncreasePosition,
  CreateDecreasePosition,
  OrderAction
} from "../generated/schema"

function _createTransactionIfNotExist(event: ethereum.Event): string {
  let id = _generateIdFromEvent(event)
  let entity = Transaction.load(id)

  if (!entity) {
    entity = new Transaction(id)
    entity.timestamp = event.block.timestamp.toI32()
    entity.blockNumber = event.block.number.toI32()
    entity.transactionIndex = event.transaction.index.toI32()
    entity.from = event.transaction.from.toHexString()
    if (!(event.transaction.to)) {
      entity.to = ""
    } else {
      entity.to = event.transaction.to!.toHexString()
    }
    entity.save()
  }

  return id
}

function _generateIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ":" + event.logIndex.toString()
}

function _getIdFromSameEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ":" + event.logIndex.minus(BigInt.fromString("1")).toString()
}

export function handleLiquidatePosition(event: vault.LiquidatePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new LiquidatePosition(id)

  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHexString()
  entity.collateralToken = event.params.collateralToken.toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.isLong = event.params.isLong
  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.reserveAmount = event.params.reserveAmount
  entity.realisedPnl = event.params.realisedPnl
  entity.markPrice = event.params.markPrice

  entity.transaction = _createTransactionIfNotExist(event)
  entity.logIndex = event.logIndex.toI32()
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = entity.isLong ? "LiquidatePosition-Long":"LiquidatePosition-Short"
  orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params = "{\"key\":\""+entity.key+"\",\"collateralToken\":\""+entity.collateralToken+"\",\"indexToken\":\""+entity.indexToken+"\",\"isLong\":"+(entity.isLong?"true":"false")+",\"size\":\""+entity.size.toString()+"\",\"collateral\":\""+entity.collateral.toString()+"\",\"reserveAmount\":\""+entity.reserveAmount.toString()+"\",\"markPrice\":\""+entity.markPrice.toString()+"\",\"feeBasisPoints\":10}"
  orderAction.save()

  store.remove("UpdatePosition", event.params.key.toHexString())
}

export function handleUpdatePosition(event: vault.UpdatePosition): void {

  let entity = UpdatePosition.load(event.params.key.toHexString())
  let id = _getIdFromSameEvent(event)
  if(!entity){
    entity = new UpdatePosition(event.params.key.toHexString())
    entity.key = event.params.key.toHexString()
    entity.size = event.params.size
    entity.collateral = event.params.collateral
    entity.averagePrice = event.params.averagePrice
    entity.entryFundingRate = event.params.entryFundingRate
    entity.reserveAmount = event.params.reserveAmount
    entity.realisedPnl = event.params.realisedPnl
    entity.price = event.params.markPrice
    entity.transaction = _createTransactionIfNotExist(event)
    entity.logIndex = event.logIndex.toI32()
    entity.timestamp = event.block.timestamp.toI32()
    let increasePosition = IncreasePosition.load(id)
    if(increasePosition){
      entity.account = increasePosition.account
      entity.collateralToken = increasePosition.collateralToken
      entity.indexToken = increasePosition.indexToken
      entity.isLong = increasePosition.isLong
    }
  }else{
    entity.size = event.params.size
    entity.collateral = event.params.collateral
    entity.averagePrice = event.params.averagePrice
    entity.entryFundingRate = event.params.entryFundingRate
    entity.reserveAmount = event.params.reserveAmount
    entity.realisedPnl = event.params.realisedPnl
    entity.price = event.params.markPrice
  }
  entity.save()
}

export function handleClosePosition(event: vault.ClosePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new ClosePosition(id)

  entity.key = event.params.key.toHexString()
  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.averagePrice = event.params.averagePrice
  entity.entryFundingRate = event.params.entryFundingRate
  entity.reserveAmount = event.params.reserveAmount
  entity.realisedPnl = event.params.realisedPnl

  entity.transaction = _createTransactionIfNotExist(event)
  entity.logIndex = event.logIndex.toI32()
  entity.timestamp = event.block.timestamp.toI32()
  entity.save()
  store.remove("UpdatePosition", event.params.key.toHexString())
}

export function handleCreateIncreasePosition(event: positionRouter.CreateIncreasePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new CreateIncreasePosition(id)

  entity.account = event.params.account.toHexString()
  let path = event.params.path
  entity.collateralToken = path[path.length - 1].toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.sizeDelta = event.params.sizeDelta
  entity.amountIn = event.params.amountIn
  entity.isLong = event.params.isLong
  entity.acceptablePrice = event.params.acceptablePrice
  entity.executionFee = event.params.executionFee

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = "CreateIncreasePosition"
      orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params =  "{\"account\":\""+entity.account+"\",\"collateralToken\":\""+entity.collateralToken+"\",\"indexToken\":\""+entity.indexToken+"\",\"sizeDelta\":\""+entity.sizeDelta.toString()+"\",\"amountIn\":\""+entity.amountIn.toString()+"\",\"isLong\":"+(entity.isLong?"true":"false")+",\"acceptablePrice\":\""+entity.acceptablePrice.toString()+"\",\"executionFee\":\""+entity.executionFee.toString()+"\"}"
      orderAction.save()
}

export function handleCreateDecreasePosition(event: positionRouter.CreateDecreasePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new CreateDecreasePosition(id)

  entity.account = event.params.account.toHexString()
  let path = event.params.path
  entity.collateralToken = path[0].toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.sizeDelta = event.params.sizeDelta
  entity.isLong = event.params.isLong
  entity.acceptablePrice = event.params.acceptablePrice
  entity.executionFee = event.params.executionFee

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = "CreateDecreasePosition"
      orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params =  "{\"account\":\""+entity.account+"\",\"collateralToken\":\""+entity.collateralToken+"\",\"indexToken\":\""+entity.indexToken+"\",\"sizeDelta\":\""+entity.sizeDelta.toString()+"\",\"isLong\":"+(entity.isLong?"true":"false")+",\"acceptablePrice\":\""+entity.acceptablePrice.toString()+"\",\"executionFee\":\""+entity.executionFee.toString()+"\"}"
      orderAction.save()
}

export function handleIncreasePosition(event: vault.IncreasePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new IncreasePosition(id)

  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHexString()
  entity.collateralToken = event.params.collateralToken.toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.collateralDelta = event.params.collateralDelta
  entity.sizeDelta = event.params.sizeDelta
  entity.isLong = event.params.isLong
  entity.price = event.params.price
  entity.fee = event.params.fee

  entity.transaction = _createTransactionIfNotExist(event)
  entity.logIndex = event.logIndex.toI32()
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = "IncreasePosition"
      orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params =  "{\"key\":\""+entity.key+"\",\"account\":\""+entity.account+"\",\"collateralToken\":\""+entity.collateralToken+"\",\"indexToken\":\""+entity.indexToken+"\",\"collateralDelta\":\""+entity.collateralDelta.toString()+"\",\"sizeDelta\":\""+entity.sizeDelta.toString()+"\",\"isLong\":"+(entity.isLong?"true":"false")+",\"price\":\""+entity.price.toString()+"\",\"fee\":\""+entity.fee.toString()+"\"}"
      orderAction.save()
}

export function handleDecreasePosition(event: vault.DecreasePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new DecreasePosition(id)

  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHexString()
  entity.collateralToken = event.params.collateralToken.toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.collateralDelta = event.params.collateralDelta
  entity.sizeDelta = event.params.sizeDelta
  entity.isLong = event.params.isLong
  entity.price = event.params.price
  entity.fee = event.params.fee

  entity.transaction = _createTransactionIfNotExist(event)
  entity.logIndex = event.logIndex.toI32()
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()


  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = "DecreasePosition"
      orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params =  "{\"key\":\""+entity.key+"\",\"account\":\""+entity.account+"\",\"collateralToken\":\""+entity.collateralToken+"\",\"indexToken\":\""+entity.indexToken+"\",\"collateralDelta\":\""+entity.collateralDelta.toString()+"\",\"sizeDelta\":\""+entity.sizeDelta.toString()+"\",\"isLong\":"+(entity.isLong?"true":"false")+",\"price\":\""+entity.price.toString()+"\",\"fee\":\""+entity.fee.toString()+"\"}"
      orderAction.save()
}

export function handleCollectMarginFees(event: vault.CollectMarginFees): void {
  let entity = new CollectMarginFee(event.transaction.hash.toHexString())

  entity.token = event.params.token
  entity.feeTokens = event.params.feeTokens
  entity.feeUsd = event.params.feeUsd

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleCollectSwapFees(event: vault.CollectSwapFees): void {
  let entity = new CollectSwapFee(event.transaction.hash.toHexString())

  entity.token = event.params.token
  entity.feeTokens = event.params.feeUsd
  entity.feeUsd = event.params.feeTokens

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()
  
  entity.save()
}

export function handleSwap(event: vault.Swap): void {
  let entity = new Swap(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.tokenIn = event.params.tokenIn.toHexString()
  entity.tokenOut = event.params.tokenOut.toHexString()
  entity.amountIn = event.params.amountIn
  entity.amountOut = event.params.amountOut
  entity.amountOutAfterFees = event.params.amountOutAfterFees
  entity.feeBasisPoints = event.params.feeBasisPoints

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
  let id = _generateIdFromEvent(event)
  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = "Swap"
      orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params = "{\"account\":\""+entity.account+"\",\"tokenIn\":\""+entity.tokenIn.toString()+"\",\"tokenOut\":\""+entity.tokenOut.toString()+"\",\"amountIn\":\""+entity.amountIn.toString()+"\",\"amountOut\":\""+entity.amountOut.toString()+"\",\"amountOutAfterFees\":\""+entity.amountOutAfterFees.toString()+"\",\"feeBasisPoints\":\""+entity.feeBasisPoints.toString()+"\"}"
      orderAction.save()
}

export function handleAddLiquidity(event: elpManager.AddLiquidity): void {
  let entity = new AddLiquidity(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.elpSupply = event.params.elpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.mintAmount = event.params.mintAmount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
  let id = _generateIdFromEvent(event)
  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = "BuyUSDG"
      orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params =  "{\"account\":\""+entity.account+"\",\"token\":\""+entity.token+"\",\"amount\":\""+entity.amount.toString()+"\",\"aumInUsdg\":\""+entity.aumInUsdg.toString()+"\",\"elpSupply\":\""+entity.elpSupply.toString()+"\",\"usdgAmount\":\""+entity.usdgAmount.toString()+"\",\"mintAmount\":\""+entity.mintAmount.toString()+"\"}"
      orderAction.save()
}

export function handleRemoveLiquidity(event: elpManager.RemoveLiquidity): void {
  let entity = new RemoveLiquidity(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.elpAmount = event.params.elpAmount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.elpSupply = event.params.elpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.amountOut = event.params.amountOut

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  let id = _generateIdFromEvent(event)

  let orderAction = new OrderAction(id)
  orderAction.account = event.params.account.toHexString()
  orderAction.action = "SellUSDG"
      orderAction.blockNumber = event.block.number
  orderAction.timestamp = event.block.timestamp.toI32()
  orderAction.txHash = event.transaction.hash.toHexString()
  
  orderAction.params =  "{\"account\":\""+entity.account+"\",\"token\":\""+entity.token+"\",\"elpAmount\":\""+entity.elpAmount.toString()+"\",\"aumInUsdg\":\""+entity.aumInUsdg.toString()+"\",\"elpSupply\":\""+entity.elpSupply.toString()+"\",\"usdgAmount\":\""+entity.usdgAmount.toString()+"\",\"amountOut\":\""+entity.amountOut.toString()+"\"}"
      orderAction.save()
}

export function handleStakeEddx(event: rewardRouter.StakeEddx): void {
  let entity = new StakeEddx(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleUnstakeEddx(event: rewardRouter.UnstakeEddx): void {
  let entity = new UnstakeEddx(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleStakeElp(event: rewardRouter.StakeElp): void {
  let entity = new StakeElp(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleUnstakeElp(event: rewardRouter.UnstakeElp): void {
  let entity = new UnstakeElp(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}
