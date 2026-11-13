// Written on every photo newly stored by one upload request.
export interface PhotoBatch {
  batchId: string;
  // Opaque client string: where the answer to the batch goes (the bot: chatId:messageId). Never parsed.
  replyTo: string | null;
}
