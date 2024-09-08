import { IndexDescription } from 'mongodb';
import { Model } from 'mongoose';

export const userIndexes: IndexDescription[] = [
    { key: { 'email': 1 }, unique: true },
];