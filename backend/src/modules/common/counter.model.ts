import { Schema, model, Document } from 'mongoose';

export interface ICounterDocument extends Document<string> {
  _id: string; // sequence identifier
  sequenceValue: number;
}

const CounterSchema = new Schema<ICounterDocument>(
  {
    _id: { type: String, required: true },
    sequenceValue: { type: Number, default: 0, required: true },
  },
  {
    _id: false,
    versionKey: false,
  }
);

export const Counter = model<ICounterDocument>('Counter', CounterSchema);

/**
 * Atomically increments and returns the next monotonic sequence number for a given counter.
 */
export const getNextSequence = async (sequenceName: string): Promise<number> => {
  const result = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );

  return result ? result.sequenceValue : 1;
};

export default Counter;
