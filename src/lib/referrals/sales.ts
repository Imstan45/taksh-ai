import type { Prisma } from "@/generated/prisma/client";

export async function recordReferralSale(tx: Prisma.TransactionClient, input: { paymentId: string; orderId: string; provider: string; providerPaymentReference: string }) {
  await tx.$executeRaw`
    insert into public.referral_sales(sales_rep_id,attribution_id,referred_user_id,referral_code,product_id,product_type,payment_order_id,payment_id,provider,provider_payment_reference,amount_in_paise,currency,status,paid_at)
    select attribution.sales_rep_id,attribution.id,orders.user_id,attribution.referral_code,orders.product_id,product.product_type,
      orders.id,${input.paymentId}::uuid,${input.provider},${input.providerPaymentReference},orders.amount_in_paise,orders.currency,'confirmed',coalesce(payment.verified_at,now())
    from public.payment_orders orders
    join public.sales_referral_attributions attribution on attribution.id=orders.sales_attribution_id
    join public.sales_reps rep on rep.id=attribution.sales_rep_id and rep.status='active'
    join public.payments payment on payment.id=${input.paymentId}::uuid
    left join public.products product on product.id=orders.product_id
    where orders.id=${input.orderId}::uuid and attribution.validity_status='valid' and attribution.registered_user_id=orders.user_id
      and attribution.attribution_expires_at>=orders.created_at and rep.user_id<>orders.user_id
    on conflict(payment_order_id) do nothing
  `;
}

export async function updateReferralRefund(tx: Prisma.TransactionClient, paymentId: string, refundedAmount: number, fullRefund: boolean) {
  await tx.$executeRaw`
    update public.referral_sales set refunded_amount_in_paise=least(amount_in_paise,greatest(refunded_amount_in_paise,${refundedAmount})),
      status=case when ${fullRefund} or ${refundedAmount}>=amount_in_paise then 'refunded' else 'partially_refunded' end,
      refunded_at=now(),updated_at=now() where payment_id=${paymentId}::uuid
  `;
}
