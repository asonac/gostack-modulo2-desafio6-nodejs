import { EntityRepository, Repository, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  private balance: Balance;

  constructor() {
    super();
    this.balance = { income: 0, outcome: 0, total: 0 };
  }

  public async getBalance(): Promise<Balance> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const transactions = await transactionRepository.find({
      select: ['value', 'type'],
    });

    let i = 0;
    for (i = 0; i < transactions.length; i += 1) {
      if (transactions[i].type === 'income') {
        this.balance.income += transactions[i].value;
        this.balance.total += transactions[i].value;
      } else {
        this.balance.outcome += transactions[i].value;
        this.balance.total -= transactions[i].value;
      }
    }

    return this.balance;
  }
}

export default TransactionsRepository;
