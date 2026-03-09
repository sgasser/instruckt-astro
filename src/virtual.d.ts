declare module "virtual:instruckt-config" {
  export const config: {
    endpoint: string;
    position: string;
    theme: string;
    adapters: string[];
    keys: Record<string, string>;
  };
}
