import { Buffer } from 'node:buffer';

export const readableStreamToBuffer = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }

  if (chunks.length === 1) {
    return Buffer.from(chunks[0]);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
};
