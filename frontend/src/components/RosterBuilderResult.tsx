import type { RosterBuilderViewModel } from "@/lib/roster-builder-view-model";
import { RosterRotationTable } from "./RosterRotationTable";
import { RosterProfilePanel } from "./RosterProfilePanel";
import { ScenarioDisclosuresPanel } from "@/components/ScenarioDisclosuresPanel";
import styles from "./ScenarioForm.module.css";

export interface RosterBuilderResultProps {
  viewModel: RosterBuilderViewModel;
  playerLabel: (playerId: string) => string;
}

/**
 * The roster-builder counterpart to ScenarioSuccessPreview: a summary (roster
 * size, aggregate contribution), the single-rotation table, the descriptive
 * team profile, and the full disclosures panel (decision 0007 §8, reused
 * unmodified — see roster-builder-view-model.ts's own comment on why
 * ScenarioDisclosures is shared). No "before/after" or "what changed"
 * sections exist here — there is no baseline roster to explain a change
 * against, only one assembled roster (decision 0014).
 */
export function RosterBuilderResult({ viewModel, playerLabel }: RosterBuilderResultProps) {
  return (
    <section className={styles.successPreview} aria-labelledby="builder-results-heading">
      <h2 id="builder-results-heading">Roster projection</h2>
      <dl className={styles.successGrid}>
        <div>
          <dt>Season</dt>
          <dd>{viewModel.season}</dd>
        </div>
        <div>
          <dt>Roster size</dt>
          <dd>{viewModel.playerIds.length}</dd>
        </div>
        <div>
          <dt>Aggregate contribution</dt>
          <dd>{viewModel.contribution.toFixed(3)}</dd>
        </div>
      </dl>

      <section className={styles.resultSection} aria-labelledby="builder-rotation-heading">
        <h3 id="builder-rotation-heading">Minutes rotation</h3>
        <RosterRotationTable
          rotation={viewModel.rotation}
          allocationRepairs={viewModel.allocationRepairs}
          season={viewModel.season}
          playerLabel={playerLabel}
        />
      </section>

      <section className={styles.resultSection} aria-labelledby="builder-profile-heading">
        <h3 id="builder-profile-heading">Team profile</h3>
        <RosterProfilePanel categories={viewModel.teamProfile} />
      </section>

      <ScenarioDisclosuresPanel disclosures={viewModel.disclosures} season={viewModel.season} />
    </section>
  );
}
