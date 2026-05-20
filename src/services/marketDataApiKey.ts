import { getSecret, setSecret } from './secretStorage';

export async function loadTwelveDataApiKey(): Promise<string> {
  return getSecret('twelveDataApiKey');
}

export async function saveTwelveDataApiKey(apiKey: string): Promise<void> {
  await setSecret('twelveDataApiKey', apiKey);
}
