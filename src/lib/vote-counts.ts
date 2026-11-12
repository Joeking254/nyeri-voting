import type { Prisma } from "@prisma/client";

export type PaidVote = {
  transactionId: string;
  checkoutRequestId?: string;
  nomineeId: string;
  categoryId: string;
  numberOfVotes: number;
  receiptNumber: string;
};

export async function claimPaymentAndIncrementVotes(
  database: Prisma.TransactionClient,
  payment: PaidVote
) {
  const whereClause: Prisma.VoteTransactionWhereInput = {
    id: payment.transactionId,
    status: "PENDING",
  };

  if (payment.checkoutRequestId) {
    whereClause.OR = [
      { transactionId: payment.checkoutRequestId },
      { transactionId: null },
    ];
  }

  const claimed = await database.voteTransaction.updateMany({
    where: whereClause,
    data: {
      status: "SUCCESS",
      mpesaReceiptNumber: payment.receiptNumber,
    },
  });
  if (claimed.count !== 1) return false;

  const nominee = await database.nominee.updateMany({
    where: { id: payment.nomineeId, categoryId: payment.categoryId },
    data: { totalVotes: { increment: BigInt(payment.numberOfVotes) } },
  });
  if (nominee.count !== 1) throw new Error("Nominee/category mismatch for paid transaction");

  const category = await database.category.updateMany({
    where: { id: payment.categoryId },
    data: { totalVotes: { increment: BigInt(payment.numberOfVotes) } },
  });
  if (category.count !== 1) throw new Error("Category not found for paid transaction");

  return true;
}
