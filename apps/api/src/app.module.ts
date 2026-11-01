import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { K3ScopeProofController } from "./k3-scope-proof.controller";
import { K3ScopeProofRepository } from "./k3-scope-proof.repository";

@Module({ controllers: [HealthController, K3ScopeProofController], providers: [K3ScopeProofRepository] })
export class AppModule {}
