import path from 'path';
import fs from 'fs';

import csv from 'csv-parse';
import { getRepository, In, getCustomRepository } from 'typeorm';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
  importedFilename: string;
}

interface CsvFile {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ importedFilename }: Request): Promise<Transaction[]> {
    const importedFilePath = path.join(
      uploadConfig.directory,
      importedFilename,
    );

    const readStream = fs.createReadStream(importedFilePath);

    const pipe = readStream.pipe(
      csv({
        from_line: 2,
      }),
    );

    const transactions: CsvFile[] = [];
    const categories: string[] = [];

    pipe.on('data', async row => {
      const [title, type, value, category] = row.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) {
        throw new AppError('Missing parameters.');
      }

      categories.push(category);

      transactions.push({
        title,
        value,
        type,
        category,
      });
    });

    await new Promise(resolve => pipe.on('end', resolve));

    const categoriesRepository = getRepository(Category);

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(importedFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
