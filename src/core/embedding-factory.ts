import {
  type EmbeddingProvider,
  OpenAIEmbeddingProvider,
  HuggingFaceEmbeddingProvider,
  JinaEmbeddingProvider,
  OllamaEmbeddingProvider,
} from "./vector-storage.js";

/**
 * Factory for creating embedding provider implementations.
 * Mirrors the API style of `VectorAdapterFactory` so that callers can
 * easily swap providers by configuration.
 */
export class EmbeddingProviderFactory {
  /**
   * Create an OpenAI embedding provider.
   * @param apiKey OpenAI API key
   * @param model Embedding model (defaults to `text-embedding-3-small`)
   */
  static createOpenAI(apiKey: string, model: string = "text-embedding-3-small"): EmbeddingProvider {
    return new OpenAIEmbeddingProvider(apiKey, model);
  }

  /**
   * Create a HuggingFace embedding provider.
   * @param apiKey HuggingFace access token ("hf_..." or similar)
   * @param model HF model name (defaults to `sentence-transformers/all-MiniLM-L6-v2`)
   */
  static createHuggingFace(apiKey: string, model: string = "sentence-transformers/all-MiniLM-L6-v2"): EmbeddingProvider {
    return new HuggingFaceEmbeddingProvider(apiKey, model);
  }

  /**
   * Create a Jina AI embedding provider.
   * @param apiKey Jina AI access token
   * @param model Jina model name (defaults to `jina-embeddings-v2-base-en`)
   */
  static createJina(apiKey: string, model: string = "jina-embeddings-v2-base-en"): EmbeddingProvider {
    return new JinaEmbeddingProvider(apiKey, model);
  }

  /**
   * Create an Ollama embedding provider (self-hosted model serving).
   * @param baseUrl Base URL of the Ollama instance (defaults to `http://localhost:11434`)
   * @param model Model name (defaults to `nomic-embed-text`)
   */
  static createOllama(baseUrl: string = "http://localhost:11434", model: string = "nomic-embed-text"): EmbeddingProvider {
    return new OllamaEmbeddingProvider(baseUrl, model);
  }
} 