"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingAdapter = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class BillingAdapter {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    async getWallet(userId) {
        const { data, error } = await this.supabase
            .from("wallets")
            .select("*")
            .eq("user_id", userId)
            .single();
        if (error)
            throw error;
        return data;
    }
    async getOrCreateWallet(userId) {
        let wallet = await this.getWallet(userId);
        if (!wallet) {
            const { data, error } = await this.supabase
                .from("wallets")
                .insert({ user_id: userId, balance_credits: 0, reserved_credits: 0 })
                .select()
                .single();
            if (error)
                throw error;
            wallet = data;
        }
        return wallet;
    }
    async reserveCredits(userId, amount) {
        const wallet = await this.getWallet(userId);
        if (!wallet)
            return false;
        const available = wallet.balance_credits - wallet.reserved_credits;
        if (available < amount)
            return false;
        const { error } = await this.supabase
            .from("wallets")
            .update({ reserved_credits: wallet.reserved_credits + amount })
            .eq("id", wallet.id);
        return !error;
    }
    async releaseCredits(userId, amount) {
        const wallet = await this.getWallet(userId);
        if (!wallet)
            return;
        await this.supabase
            .from("wallets")
            .update({ reserved_credits: Math.max(0, wallet.reserved_credits - amount) })
            .eq("id", wallet.id);
    }
    async deductCredits(userId, amount, description, referenceType, referenceId) {
        const wallet = await this.getWallet(userId);
        if (!wallet)
            throw new Error("Wallet not found");
        const newBalance = wallet.balance_credits - amount;
        const newReserved = Math.max(0, wallet.reserved_credits - amount);
        const { error: walletError } = await this.supabase
            .from("wallets")
            .update({
            balance_credits: newBalance,
            reserved_credits: newReserved,
        })
            .eq("id", wallet.id);
        if (walletError)
            throw walletError;
        const { data: transaction, error: txError } = await this.supabase
            .from("wallet_transactions")
            .insert({
            user_id: userId,
            wallet_id: wallet.id,
            type: "debit",
            amount,
            balance_after: newBalance,
            reason: description,
            description,
            reference_type: referenceType,
            reference_id: referenceId,
        })
            .select()
            .single();
        if (txError)
            throw txError;
        return transaction;
    }
    async addCredits(userId, amount, description, adminId, adminNote, receiptUrl) {
        const wallet = await this.getOrCreateWallet(userId);
        const newBalance = wallet.balance_credits + amount;
        const { error: walletError } = await this.supabase
            .from("wallets")
            .update({ balance_credits: newBalance })
            .eq("id", wallet.id);
        if (walletError)
            throw walletError;
        const { data: transaction, error: txError } = await this.supabase
            .from("wallet_transactions")
            .insert({
            user_id: userId,
            wallet_id: wallet.id,
            type: "credit",
            amount,
            balance_after: newBalance,
            reason: description,
            description,
            admin_id: adminId,
            admin_note: adminNote,
            receipt_url: receiptUrl,
        })
            .select()
            .single();
        if (txError)
            throw txError;
        return transaction;
    }
    async applyVoucher(userId, code) {
        const { data: voucher, error: voucherError } = await this.supabase
            .from("vouchers")
            .select("*")
            .eq("code", code)
            .eq("is_active", true)
            .single();
        if (voucherError || !voucher)
            throw new Error("Invalid voucher code");
        const now = new Date();
        const validFrom = new Date(voucher.valid_from);
        const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null;
        if (now < validFrom)
            throw new Error("Voucher not yet valid");
        if (validUntil && now > validUntil)
            throw new Error("Voucher expired");
        if (voucher.max_uses && voucher.used_count >= voucher.max_uses) {
            throw new Error("Voucher usage limit reached");
        }
        const { data: usage } = await this.supabase
            .from("voucher_usage")
            .select("*")
            .eq("voucher_id", voucher.id)
            .eq("user_id", userId)
            .single();
        if (usage)
            throw new Error("Voucher already used");
        let creditsAdded = 0;
        if (voucher.type === "credits") {
            creditsAdded = voucher.value;
            await this.addCredits(userId, creditsAdded, `Voucher: ${code}`);
        }
        await this.supabase.from("voucher_usage").insert({
            voucher_id: voucher.id,
            user_id: userId,
        });
        await this.supabase
            .from("vouchers")
            .update({ used_count: voucher.used_count + 1 })
            .eq("id", voucher.id);
        return creditsAdded;
    }
    async getPlan(planId) {
        const { data, error } = await this.supabase
            .from("plans")
            .select("*")
            .eq("id", planId)
            .single();
        if (error)
            return null;
        return data;
    }
    async getActivePlans() {
        const { data, error } = await this.supabase
            .from("plans")
            .select("*")
            .eq("is_active", true)
            .eq("is_visible", true)
            .order("sort_order");
        if (error)
            return [];
        return data || [];
    }
    async estimateCost(toolType, fileSize, duration, requiresGpu) {
        const baseCost = 10;
        const sizeCost = (fileSize / (1024 * 1024)) * 2;
        const durationCost = duration * 0.5;
        const gpuMultiplier = requiresGpu ? 3 : 1;
        return Math.ceil((baseCost + sizeCost + durationCost) * gpuMultiplier);
    }
}
exports.BillingAdapter = BillingAdapter;
