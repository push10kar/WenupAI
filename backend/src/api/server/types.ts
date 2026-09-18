import { InterviewService } from "../../application/interview";
import { SessionRepository } from "../../application/repositories";
import { LLMClient } from "../../infrastructure/llm";

export interface AppDependencies {
  readonly interviewService?: InterviewService;
  readonly sessionRepository?: SessionRepository;
  readonly llmClient?: LLMClient;
}
