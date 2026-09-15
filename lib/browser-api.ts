// Optional browser APIs are feature-detected before use. These interfaces cover
// only the surface this app consumes and do not assume browser-wide support.
export interface SpeechRecognitionInput {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export function speechConstructor() {
  const browser = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInput;
    webkitSpeechRecognition?: new () => SpeechRecognitionInput;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
export interface BrowserModelTool {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, never>;
    additionalProperties: boolean;
  };
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(input: unknown): Promise<unknown>;
}
export function browserModelContext() {
  return (
    document as Document & {
      modelContext?: {
        registerTool(
          tool: BrowserModelTool,
          options: { signal: AbortSignal },
        ): void | Promise<void>;
      };
    }
  ).modelContext;
}
