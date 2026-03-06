import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { config } from '@core/bot-config'

// global variable

const prefix = '.'

// ============================================================
// TYPES & INTERFACES
// ============================================================

import type { WASocket } from 'baileys'

export interface ICoin {
    id: string
    name: string
    price: number
    supply: number                  
    circulatingSupply: number       
    lastUpdated: number
    priceHistory: IPriceHistory[]
    ipoStatus?: 'pending' | 'active' | 'done'
}

export interface IPriceHistory {
    price: number
    timestamp: number
}

export interface IWallet {
    lid: string
    phoneJid: string
    balance: number                 
    portfolio: Record<string, number>
    totalDeposited: number
    registeredAt: number
}

export interface IOrder {
    id: string
    lid: string
    coin: string
    type: 'buy' | 'sell'
    amountCash: number
    amountCoin: number
    targetPrice: number
    createdAt: number
}

export interface ITrade {
    id: string
    lid: string
    coin: string
    type: 'buy' | 'sell'
    amountCash: number
    amountCoin: number
    price: number
    fee: number
    timestamp: number
}

export interface IAlert {
    id: string
    lid: string
    coin: string
    targetPrice: number
    direction: 'above' | 'below'
    createdAt: number
}

export interface IIpo {
    coinId: string
    ipoPrice: number
    totalSlot: number
    subscriptions: IIpoSubscription[]
    deadline: number
    status: 'open' | 'closed' | 'done'
    createdAt: number
}

export interface IIpoSubscription {
    lid: string
    amountCash: number
    allocatedCoin?: number
}

export interface ITradeConfig {
    feePercent: number
    startingBalance: number
    feeDistribution: 'master' | 'all-owner'
}

export interface ITradeResult {
    success: boolean
    amountCoin: number
    amountCash: number
    price: number
    fee: number
    newBalance: number
    newCoinBalance: number
}

export interface IPortfolioSummary {
    lid: string
    balance: number
    holdings: IHolding[]
    totalHoldingsValue: number
    totalAssets: number
    totalDeposited: number
    profitLoss: number
    profitLossPercent: number
}

export interface IHolding {
    coin: string
    amount: number
    currentPrice: number
    value: number
    name: string
}

export interface ILeaderboardEntry {
    rank: number
    lid: string
    phoneJid: string
    totalAssets: number
    profitLoss: number
    profitLossPercent: number
}

// ============================================================
// CRYPTO TRADE CLASS
// ============================================================

export class CryptoTrade {
    private baseDir = path.resolve('./databases/cryptotrade')
    private coinsPath = path.join(this.baseDir, 'coins.json')
    private walletsPath = path.join(this.baseDir, 'wallets.json')
    private ordersPath = path.join(this.baseDir, 'orders.json')
    private tradesPath = path.join(this.baseDir, 'trades.json')
    private alertsPath = path.join(this.baseDir, 'alerts.json')
    private iposPath = path.join(this.baseDir, 'ipos.json')
    private configPath = path.join(this.baseDir, 'config.json')

    // ── DB HELPERS ────────────────────────────────────────────
    async processAfterTrade(coinId: string, socket: WASocket): Promise<void> {
    const notifications = await this.checkAlerts(coinId)
    for (const notif of notifications) {
        if (!notif.phoneJid) continue
        try {
            await socket.sendMessage(notif.phoneJid, { text: notif.message })
        } catch (err: any) {
            logger.log(`Failed to send alert to ${notif.phoneJid}: ${err?.message}`, 'WARN', 'cryptotrade')
        }
    }
}

    private async ensureDir(): Promise<void> {
        await fs.mkdir(this.baseDir, { recursive: true })
    }

    private async readJSON<T>(filePath: string, fallback: T): Promise<T> {
        try {
            const raw = await fs.readFile(filePath, 'utf-8')
            return JSON.parse(raw) as T
        } catch {
            return fallback
        }
    }

    private async writeJSON<T>(filePath: string, data: T): Promise<void> {
        await this.ensureDir()
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    }

    // ── CONFIG ────────────────────────────────────────────────

    async getConfig(): Promise<ITradeConfig> {
        return this.readJSON<ITradeConfig>(this.configPath, {
            feePercent: 0.1,
            startingBalance: 100000,
            feeDistribution: 'master',
        })
    }

    async setFee(percent: number): Promise<void> {
        if (percent < 0 || percent > 100) throw new Error('Fee must be between 0 - 100')
        const config = await this.getConfig()
        config.feePercent = percent
        await this.writeJSON(this.configPath, config)
    }

    // ── COINS ─────────────────────────────────────────────────

    async getCoins(): Promise<ICoin[]> {
        return this.readJSON<ICoin[]>(this.coinsPath, [])
    }

    async getCoin(coinId: string): Promise<ICoin | null> {
        const coins = await this.getCoins()
        return coins.find(c => c.id.toUpperCase() === coinId.toUpperCase()) ?? null
    }

    async getPrice(coinId: string): Promise<ICoin> {
        const coin = await this.getCoin(coinId)
        if (!coin) throw new Error(`Coin ${coinId} not found.`)
        return coin
    }

    async addCoin(id: string, name: string, initialPrice: number, supply: number): Promise<void> {
        const coins = await this.getCoins()
        const exists = coins.some(c => c.id.toUpperCase() === id.toUpperCase())
        if (exists) throw new Error(`Coin ${id} already registered.`)

        const newCoin: ICoin = {
            id: id.toUpperCase(),
            name,
            price: initialPrice,
            supply,
            circulatingSupply: 0,
            lastUpdated: Date.now(),
            priceHistory: [{ price: initialPrice, timestamp: Date.now() }],
        }

        coins.push(newCoin)
        await this.writeJSON(this.coinsPath, coins)
    }

    private calculatePriceImpact(
        currentPrice: number,
        volumeCash: number,
        circulatingSupply: number,
        type: 'buy' | 'sell'
    ): number {
        const marketCap = currentPrice * (circulatingSupply || 1)
        const rawImpact = Math.min(volumeCash / marketCap, 0.05)
        const multiplier = type === 'buy' ? 1 + rawImpact : 1 - rawImpact
        return Math.max(currentPrice * multiplier, 1)
    }

    private async updatePrice(coinId: string, type: 'buy' | 'sell', volumeCash: number): Promise<void> {
        const coins = await this.getCoins()
        const idx = coins.findIndex(c => c.id.toUpperCase() === coinId.toUpperCase())
        if (idx === -1) return

        const coin = coins[idx]
        if (!coin) return
        const newPrice = this.calculatePriceImpact(coin.price, volumeCash, coin.circulatingSupply, type)

        coin.price = Math.round(newPrice)
        coin.lastUpdated = Date.now()
        coin.priceHistory.push({ price: coin.price, timestamp: Date.now() })

        if (coin.priceHistory.length > 100) {
            coin.priceHistory = coin.priceHistory.slice(-100)
        }

        coins[idx] = coin
        await this.writeJSON(this.coinsPath, coins)
    }

    async injectSupply(coinId: string, amount: number): Promise<ICoin> {
        const coins = await this.getCoins()
        const idx = coins.findIndex(c => c.id.toUpperCase() === coinId.toUpperCase())
        if (idx === -1) throw new Error(`Coin ${coinId} not found.`)

        const coin = coins[idx]
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        coin.circulatingSupply += amount
        const impactPrice = this.calculatePriceImpact(
            coin.price,
            coin.price * amount * 2,
            coin.circulatingSupply,
            'sell'
        )
        coin.price = Math.round(impactPrice)
        coin.lastUpdated = Date.now()
        coin.priceHistory.push({ price: coin.price, timestamp: Date.now() })
        coins[idx] = coin

        await this.writeJSON(this.coinsPath, coins)
        return coin
    }

    async burnSupply(coinId: string, amount: number): Promise<ICoin> {
        const coins = await this.getCoins()
        const idx = coins.findIndex(c => c.id.toUpperCase() === coinId.toUpperCase())
        if (idx === -1) throw new Error(`Coin ${coinId} not found.`)
        if (!coins[idx]) throw new Error(`Coin ${coinId} not found.`)
        if (coins[idx].circulatingSupply < amount) throw new Error('The number of burns exceeds the circulating supply.')

        coins[idx].circulatingSupply -= amount
        const impactPrice = this.calculatePriceImpact(
            coins[idx].price,
            coins[idx].price * amount * 2,
            coins[idx].circulatingSupply,
            'buy'
        )
        coins[idx].price = Math.round(impactPrice)
        coins[idx].lastUpdated = Date.now()
        coins[idx].priceHistory.push({ price: coins[idx].price, timestamp: Date.now() })

        await this.writeJSON(this.coinsPath, coins)
        return coins[idx]
    }

    // ── WALLET ────────────────────────────────────────────────

    async getWallets(): Promise<IWallet[]> {
        return this.readJSON<IWallet[]>(this.walletsPath, [])
    }

    async getWallet(lid: string): Promise<IWallet | null> {
        const wallets = await this.getWallets()
        return wallets.find(w => w.lid === lid) ?? null
    }

    async getOrCreateWallet(lid: string, phoneJid: string): Promise<IWallet> {
        const wallets = await this.getWallets()
        const existing = wallets.find(w => w.lid === lid)
        if (existing) return existing

        const config = await this.getConfig()
        const newWallet: IWallet = {
            lid,
            phoneJid,
            balance: config.startingBalance,
            portfolio: {},
            totalDeposited: config.startingBalance,
            registeredAt: Date.now(),
        }

        wallets.push(newWallet)
        await this.writeJSON(this.walletsPath, wallets)
        return newWallet
    }

    async initOwnerWallets(owners: { lid: string; phoneJid?: string }[]): Promise<void> {
        const wallets = await this.getWallets()
        let changed = false

        for (const owner of owners) {
            const exists = wallets.some(w => w.lid === owner.lid)
            if (!exists) {
                const config = await this.getConfig()
                wallets.push({
                    lid: owner.lid,
                    phoneJid: owner.phoneJid ?? '',
                    balance: config.startingBalance,
                    portfolio: {},
                    totalDeposited: config.startingBalance,
                    registeredAt: Date.now(),
                })
                changed = true
            }
        }

        if (changed) await this.writeJSON(this.walletsPath, wallets)
    }

    private async updateWallet(wallet: IWallet): Promise<void> {
        const wallets = await this.getWallets()
        const idx = wallets.findIndex(w => w.lid === wallet.lid)
        if (idx === -1) throw new Error('Wallet not found.')
        wallets[idx] = wallet
        await this.writeJSON(this.walletsPath, wallets)
    }

    async getPortfolio(lid: string): Promise<IPortfolioSummary> {
        const wallet = await this.getWallet(lid)
        if (!wallet) throw new Error(`Wallet not found., please ${prefix}trade-register`)

        const coins = await this.getCoins()
        const holdings: IHolding[] = []
        let totalHoldingsValue = 0

        for (const [coinId, amount] of Object.entries(wallet.portfolio)) {
            if (amount <= 0) continue
            const coin = coins.find(c => c.id === coinId)
            if (!coin) continue
            const value = coin.price * amount
            totalHoldingsValue += value
            holdings.push({
                coin: coinId,
                name: coin.name,
                amount,
                currentPrice: coin.price,
                value,
            })
        }

        const totalAssets = wallet.balance + totalHoldingsValue
        const profitLoss = totalAssets - wallet.totalDeposited
        const profitLossPercent = wallet.totalDeposited > 0
            ? (profitLoss / wallet.totalDeposited) * 100
            : 0

        return {
            lid,
            balance: wallet.balance,
            holdings,
            totalHoldingsValue,
            totalAssets,
            totalDeposited: wallet.totalDeposited,
            profitLoss,
            profitLossPercent,
        }
    }

    // ── FEE ───────────────────────────────────────────────────

    private async distributeFee(amountFee: number): Promise<void> {
        if (amountFee <= 0) return
        const config = await this.getConfig()
        const wallets = await this.getWallets()

        const { ownerHandler } = await import('@core/owner')
        const allOwners = await ownerHandler.getAll()

        const recipients = config.feeDistribution === 'master'
            ? allOwners.filter(o => o.level === 'master')
            : allOwners

        if (recipients.length === 0) return

        const sharePerOwner = Math.floor(amountFee / recipients.length)
        let changed = false

        for (const owner of recipients) {
            const idx = wallets.findIndex(w => w.lid === owner.lid)
            if (idx !== -1 && wallets[idx]) {
                wallets[idx].balance += sharePerOwner
                changed = true
            }
        }

        if (changed) await this.writeJSON(this.walletsPath, wallets)
    }

    // ── TRADING ───────────────────────────────────────────────

    async marketBuy(lid: string, coinId: string, amountCash: number): Promise<ITradeResult> {
        const wallet = await this.getWallet(lid)
        if (!wallet) throw new Error(`Wallet not found., please ${prefix}trade-register`)

        const coin = await this.getCoin(coinId)
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        const config = await this.getConfig()
        const fee = Math.floor(amountCash * (config.feePercent / 100))
        const totalNeeded = amountCash + fee

        if (wallet.balance < totalNeeded) {
            throw new Error(
                `Insufficient balance. Required: ${totalNeeded.toLocaleString()}, ` +
                `Balance: ${wallet.balance.toLocaleString()}`
            )
        }

        const amountCoin = amountCash / coin.price
        wallet.balance -= totalNeeded
        wallet.portfolio[coin.id] = (wallet.portfolio[coin.id] ?? 0) + amountCoin

        await this.updateWallet(wallet)
        await this.distributeFee(fee)
        await this.updatePrice(coin.id, 'buy', amountCash)
        await this.checkAndExecutePendingOrders(coin.id)
        await this.checkAlerts(coin.id)

        const trade: ITrade = {
            id: randomUUID(),
            lid,
            coin: coin.id,
            type: 'buy',
            amountCash,
            amountCoin,
            price: coin.price,
            fee,
            timestamp: Date.now(),
        }
        await this.saveTrade(trade)

        return {
            success: true,
            amountCoin,
            amountCash,
            price: coin.price,
            fee,
            newBalance: wallet.balance,
            newCoinBalance: wallet.portfolio[coin.id] ?? 0,
        }
    }

    async marketSell(lid: string, coinId: string, amountCoin: number): Promise<ITradeResult> {
        const wallet = await this.getWallet(lid)
        if (!wallet) throw new Error(`Wallet not found., please ${prefix}trade-register`)

        const coin = await this.getCoin(coinId)
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        const held = wallet.portfolio[coin.id] ?? 0
        if (held < amountCoin) {
            throw new Error(
                `${coin.id} not enough. Owned: ${held}, ` +
                `Want to sell: ${amountCoin}`
            )
        }

        const config = await this.getConfig()
        const grossCash = coin.price * amountCoin
        const fee = Math.floor(grossCash * (config.feePercent / 100))
        const netCash = grossCash - fee

        wallet.portfolio[coin.id] = held - amountCoin
        if ((wallet.portfolio[coin.id] ?? 0) <= 0) delete wallet.portfolio[coin.id]
        wallet.balance += netCash

        await this.updateWallet(wallet)
        await this.distributeFee(fee)
        await this.updatePrice(coin.id, 'sell', grossCash)
        await this.checkAndExecutePendingOrders(coin.id)
        await this.checkAlerts(coin.id)

        const trade: ITrade = {
            id: randomUUID(),
            lid,
            coin: coin.id,
            type: 'sell',
            amountCash: netCash,
            amountCoin,
            price: coin.price,
            fee,
            timestamp: Date.now(),
        }
        await this.saveTrade(trade)

        return {
            success: true,
            amountCoin,
            amountCash: netCash,
            price: coin.price,
            fee,
            newBalance: wallet.balance,
            newCoinBalance: wallet.portfolio[coin.id] ?? 0,
        }
    }

    // ── LIMIT ORDERS ──────────────────────────────────────────

    async getOrders(): Promise<IOrder[]> {
        return this.readJSON<IOrder[]>(this.ordersPath, [])
    }

    async getPendingOrders(lid: string): Promise<IOrder[]> {
        const orders = await this.getOrders()
        return orders.filter(o => o.lid === lid)
    }

    async limitBuy(lid: string, coinId: string, amountCash: number, targetPrice: number): Promise<IOrder> {
        const wallet = await this.getWallet(lid)
        if (!wallet) throw new Error(`Wallet not found., please ${prefix}trade-register`)

        const coin = await this.getCoin(coinId)
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        const config = await this.getConfig()
        const fee = Math.floor(amountCash * (config.feePercent / 100))
        const totalLocked = amountCash + fee

        if (wallet.balance < totalLocked) {
            throw new Error(
                `Balance is not enough to lock. Required: ${totalLocked.toLocaleString()}, ` +
                `Balance: ${wallet.balance.toLocaleString()}`
            )
        }

        wallet.balance -= totalLocked
        await this.updateWallet(wallet)

        const order: IOrder = {
            id: randomUUID(),
            lid,
            coin: coin.id,
            type: 'buy',
            amountCash,
            amountCoin: 0,
            targetPrice,
            createdAt: Date.now(),
        }

        const orders = await this.getOrders()
        orders.push(order)
        await this.writeJSON(this.ordersPath, orders)
        return order
    }

    async limitSell(lid: string, coinId: string, amountCoin: number, targetPrice: number): Promise<IOrder> {
        const wallet = await this.getWallet(lid)
        if (!wallet) throw new Error(`Wallet not found., please ${prefix}trade-register`)

        const coin = await this.getCoin(coinId)
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        const held = wallet.portfolio[coin.id] ?? 0
        if (held < amountCoin) {
            throw new Error(
                `${coin.id} not enough. Owned: ${held}, ` +
                `Want to sell: ${amountCoin}`
            )
        }

        wallet.portfolio[coin.id] = held - amountCoin
        if ((wallet.portfolio[coin.id] ?? 0) <= 0) delete wallet.portfolio[coin.id]
        await this.updateWallet(wallet)

        const order: IOrder = {
            id: randomUUID(),
            lid,
            coin: coin.id,
            type: 'sell',
            amountCash: 0,
            amountCoin,
            targetPrice,
            createdAt: Date.now(),
        }

        const orders = await this.getOrders()
        orders.push(order)
        await this.writeJSON(this.ordersPath, orders)
        return order
    }

    async cancelOrder(lid: string, orderId: string): Promise<IOrder> {
        const orders = await this.getOrders()
        const idx = orders.findIndex(o => o.id === orderId && o.lid === lid)
        if (idx === -1) throw new Error('Order not found.')

        const order = orders[idx]
        if (!order) throw new Error('Order not found.')
        const wallet = await this.getWallet(lid)
        if (!wallet) throw new Error('Wallet not found.')

        if (order.type === 'buy') {
            const config = await this.getConfig()
            const fee = Math.floor(order.amountCash * (config.feePercent / 100))
            wallet.balance += order.amountCash + fee
        } else {
            wallet.portfolio[order.coin] = (wallet.portfolio[order.coin] ?? 0) + order.amountCoin
        }

        await this.updateWallet(wallet)
        orders.splice(idx, 1)
        await this.writeJSON(this.ordersPath, orders)
        return order
    }

    async checkAndExecutePendingOrders(coinId: string): Promise<void> {
        const coin = await this.getCoin(coinId)
        if (!coin) return

        const orders = await this.getOrders()
        const relevant = orders.filter(
            o => o.coin === coinId &&
                ((o.type === 'buy' && coin.price <= o.targetPrice) ||
                    (o.type === 'sell' && coin.price >= o.targetPrice))
        )

        if (relevant.length === 0) return

        const remainingOrders = orders.filter(o => !relevant.some(r => r.id === o.id))
        await this.writeJSON(this.ordersPath, remainingOrders)

        for (const order of relevant) {
            const wallet = await this.getWallet(order.lid)
            if (!wallet) continue

            if (order.type === 'buy') {
                const amountCoin = order.amountCash / coin.price
                wallet.portfolio[coin.id] = (wallet.portfolio[coin.id] ?? 0) + amountCoin
                await this.updateWallet(wallet)

                const config = await this.getConfig()
                const fee = Math.floor(order.amountCash * (config.feePercent / 100))
                await this.distributeFee(fee)

                await this.saveTrade({
                    id: randomUUID(),
                    lid: order.lid,
                    coin: coin.id,
                    type: 'buy',
                    amountCash: order.amountCash,
                    amountCoin,
                    price: coin.price,
                    fee,
                    timestamp: Date.now(),
                })
            } else {
                const grossCash = coin.price * order.amountCoin
                const config = await this.getConfig()
                const fee = Math.floor(grossCash * (config.feePercent / 100))
                wallet.balance += grossCash - fee
                await this.updateWallet(wallet)
                await this.distributeFee(fee)

                await this.saveTrade({
                    id: randomUUID(),
                    lid: order.lid,
                    coin: coin.id,
                    type: 'sell',
                    amountCash: grossCash - fee,
                    amountCoin: order.amountCoin,
                    price: coin.price,
                    fee,
                    timestamp: Date.now(),
                })
            }
        }
    }

    // ── TRADES HISTORY ────────────────────────────────────────

    private async saveTrade(trade: ITrade): Promise<void> {
        const trades = await this.readJSON<ITrade[]>(this.tradesPath, [])
        trades.push(trade)
        await this.writeJSON(this.tradesPath, trades)
    }

    async getTradeHistory(lid: string, coinId?: string, limit = 10): Promise<ITrade[]> {
        const trades = await this.readJSON<ITrade[]>(this.tradesPath, [])
        return trades
            .filter(t => t.lid === lid && (!coinId || t.coin === coinId.toUpperCase()))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
    }

    // ── ALERTS ────────────────────────────────────────────────

    async getAlerts(): Promise<IAlert[]> {
        return this.readJSON<IAlert[]>(this.alertsPath, [])
    }

    async getUserAlerts(lid: string): Promise<IAlert[]> {
        const alerts = await this.getAlerts()
        return alerts.filter(a => a.lid === lid)
    }

    async setAlert(lid: string, coinId: string, targetPrice: number): Promise<IAlert> {
        const coin = await this.getCoin(coinId)
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        const direction: 'above' | 'below' = targetPrice > coin.price ? 'above' : 'below'
        const alert: IAlert = {
            id: randomUUID(),
            lid,
            coin: coin.id,
            targetPrice,
            direction,
            createdAt: Date.now(),
        }

        const alerts = await this.getAlerts()
        alerts.push(alert)
        await this.writeJSON(this.alertsPath, alerts)
        return alert
    }

    async deleteAlert(lid: string, alertId: string): Promise<void> {
        const alerts = await this.getAlerts()
        const idx = alerts.findIndex(a => a.id === alertId && a.lid === lid)
        if (idx === -1) throw new Error('Alert not found.')
        alerts.splice(idx, 1)
        await this.writeJSON(this.alertsPath, alerts)
    }

    async checkAlerts(coinId: string): Promise<{ phoneJid: string; message: string }[]> {
        const coin = await this.getCoin(coinId)
        if (!coin) return []

        const alerts = await this.getAlerts()
        const triggered = alerts.filter(
            a => a.coin === coinId &&
                ((a.direction === 'above' && coin.price >= a.targetPrice) ||
                    (a.direction === 'below' && coin.price <= a.targetPrice))
        )

        if (triggered.length === 0) return []

        const wallets = await this.getWallets()
        const notifications: { phoneJid: string; message: string }[] = []

        for (const alert of triggered) {
            const wallet = wallets.find(w => w.lid === alert.lid)
            if (!wallet?.phoneJid) continue

            notifications.push({
                phoneJid: wallet.phoneJid,
                message:
                    `🚨 *Alert Triggered!*\n` +
                    `Coin: *${coin.name} (${coin.id})*\n` +
                    `Target: ${alert.targetPrice.toLocaleString()}\n` +
                    `Current price: ${coin.price.toLocaleString()}\n` +
                    `Direction: ${alert.direction === 'above' ? '📈 Rise above the target' : '📉 Drop below target'}`
            })
        }

        const remainingAlerts = alerts.filter(a => !triggered.some(t => t.id === a.id))
        await this.writeJSON(this.alertsPath, remainingAlerts)

        return notifications
    }

    // ── LEADERBOARD ───────────────────────────────────────────

    async getLeaderboard(limit = 10): Promise<ILeaderboardEntry[]> {
        const wallets = await this.getWallets()
        const coins = await this.getCoins()

        const entries: ILeaderboardEntry[] = []

        for (const wallet of wallets) {
            let totalHoldingsValue = 0
            for (const [coinId, amount] of Object.entries(wallet.portfolio)) {
                const coin = coins.find(c => c.id === coinId)
                if (coin) totalHoldingsValue += coin.price * amount
            }

            const totalAssets = wallet.balance + totalHoldingsValue
            const profitLoss = totalAssets - wallet.totalDeposited
            const profitLossPercent = wallet.totalDeposited > 0
                ? (profitLoss / wallet.totalDeposited) * 100
                : 0

            entries.push({
                rank: 0,
                lid: wallet.lid,
                phoneJid: wallet.phoneJid,
                totalAssets,
                profitLoss,
                profitLossPercent,
            })
        }

        return entries
            .sort((a, b) => b.totalAssets - a.totalAssets)
            .slice(0, limit)
            .map((e, i) => ({ ...e, rank: i + 1 }))
    }

    // ── IPO ───────────────────────────────────────────────────

    async getIpos(): Promise<IIpo[]> {
        return this.readJSON<IIpo[]>(this.iposPath, [])
    }

    async createIpo(coinId: string, ipoPrice: number, totalSlot: number, durationMs: number): Promise<IIpo> {
        const coin = await this.getCoin(coinId)
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        const ipos = await this.getIpos()
        const existingOpen = ipos.find(i => i.coinId === coinId && i.status === 'open')
        if (existingOpen) throw new Error(`IPO for ${coinId} is live and still open`)

        const ipo: IIpo = {
            coinId: coin.id,
            ipoPrice,
            totalSlot,
            subscriptions: [],
            deadline: Date.now() + durationMs,
            status: 'open',
            createdAt: Date.now(),
        }

        ipos.push(ipo)
        await this.writeJSON(this.iposPath, ipos)
        return ipo
    }

    async subscribeIpo(lid: string, coinId: string, amountCash: number): Promise<void> {
        const ipos = await this.getIpos()
        const idx = ipos.findIndex(i => i.coinId === coinId.toUpperCase() && i.status === 'open')
        if (idx === -1) throw new Error(`There is no open IPO for ${coinId}`)

        const ipo = ipos[idx]
        if (!ipo) throw new Error(`There is no open IPO for ${coinId}`)
        if (Date.now() > ipo.deadline) throw new Error('IPO has passed the deadline')

        const wallet = await this.getWallet(lid)
        if (!wallet) throw new Error(`Wallet not found., please ${prefix}trade-register`)
        if (wallet.balance < amountCash) {
            throw new Error(`Insufficient balance. Balance: ${wallet.balance.toLocaleString()}`)
        }

        const existingSub = ipo.subscriptions.find(s => s.lid === lid)
        if (existingSub) throw new Error('Already subscribed to this IPO')

        wallet.balance -= amountCash
        await this.updateWallet(wallet)

        ipo.subscriptions.push({ lid, amountCash })
        ipos[idx] = ipo
        await this.writeJSON(this.iposPath, ipos)
    }

    async executeIpo(coinId: string): Promise<{ success: number; refunded: number }> {
        const ipos = await this.getIpos()
        const idx = ipos.findIndex(i => i.coinId === coinId.toUpperCase() && i.status === 'open')
        if (idx === -1) throw new Error(`There is no open IPO for ${coinId}`)

        const ipo = ipos[idx]
        if (!ipo) throw new Error(`There is no open IPO for ${coinId}`)
        ipo.status = 'closed'

        const coins = await this.getCoins()
        const coinIdx = coins.findIndex(c => c.id === coinId.toUpperCase())
        if (coinIdx === -1) throw new Error(`Coin ${coinId} not found.`)

        const coin = coins[coinIdx]
        if (!coin) throw new Error(`Coin ${coinId} not found.`)

        const totalSubscribed = ipo.subscriptions.reduce((sum, s) => sum + s.amountCash, 0)
        const totalCoinNeeded = totalSubscribed / ipo.ipoPrice

        let success = 0
        let refunded = 0

        if (totalCoinNeeded <= ipo.totalSlot) {
            for (const sub of ipo.subscriptions) {
                const wallet = await this.getWallet(sub.lid)
                if (!wallet) continue
                const coinAmount = sub.amountCash / ipo.ipoPrice
                wallet.portfolio[coinId] = (wallet.portfolio[coinId] ?? 0) + coinAmount
                await this.updateWallet(wallet)
                success++
            }
            coin.circulatingSupply += totalCoinNeeded
        } else {
            const allocationRatio = ipo.totalSlot / totalCoinNeeded
            for (const sub of ipo.subscriptions) {
                const wallet = await this.getWallet(sub.lid)
                if (!wallet) continue
                const allocatedCoin = (sub.amountCash / ipo.ipoPrice) * allocationRatio
                const usedCash = allocatedCoin * ipo.ipoPrice
                const refundCash = sub.amountCash - usedCash

                wallet.portfolio[coinId] = (wallet.portfolio[coinId] ?? 0) + allocatedCoin
                wallet.balance += refundCash
                await this.updateWallet(wallet)
                success++
                refunded += refundCash > 0 ? 1 : 0
            }
            coin.circulatingSupply += ipo.totalSlot
        }

        coin.price = ipo.ipoPrice
        coin.priceHistory.push({ price: ipo.ipoPrice, timestamp: Date.now() })
        coins[coinIdx] = coin
        await this.writeJSON(this.coinsPath, coins)

        ipo.status = 'done'
        ipos[idx] = ipo
        await this.writeJSON(this.iposPath, ipos)

        return { success, refunded }
    }
}

export const cryptoTrade = new CryptoTrade()