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
    this.balance = { income: 0.0, outcome: 0.0, total: 0.0 };
  }

  public async getBalance(): Promise<Balance> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const transactions = await transactionRepository.find({
      select: ['value', 'type'],
    });

    const { income, outcome } = transactions.reduce(
      (accumulator, transaction) => {
        switch (transaction.type) {
          case 'income':
            accumulator.income += Number(transaction.value);
            break;
          case 'outcome':
            accumulator.outcome += Number(transaction.value);
            break;
          default:
            break;
        }

        return accumulator;
      },
      { income: 0, outcome: 0 },
    );

    const total = income - outcome;

    // let i = 0;
    // for (i = 0; i < transactions.length; i += 1) {
    //   if (transactions[i].type === 'income') {
    //     this.balance.income += Number(transactions[i].value);
    //     this.balance.total += Number(transactions[i].value);
    //   } else {
    //     this.balance.outcome += Number(transactions[i].value);
    //     this.balance.total -= Number(transactions[i].value);
    //   }
    // }

    return { income, outcome, total };
  }
}

export default TransactionsRepository;
