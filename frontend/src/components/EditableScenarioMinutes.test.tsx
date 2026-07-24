import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const scenarioMocks = vi.hoisted(() => ({ postScenario: vi.fn() }));
vi.mock("@/lib/api/scenarios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/scenarios")>();
  return { ...actual, postScenario: scenarioMocks.postScenario };
});

import { EditableScenarioMinutes } from "./EditableScenarioMinutes";
import { toScenarioViewModel } from "@/lib/view-model";
import { ScenarioApiError } from "@/lib/api/errors";
import type { ScenarioResponse } from "@/lib/api/scenarios";

const DEFAULT_RESPONSE: ScenarioResponse = {
  team_id: "GSW",
  season: "2014-15",
  player_out_id: "barbole01",
  player_in_id: "acyqu01",
  baseline_rotation: [
    { player_id: "curryst01", minutes: 200 },
    { player_id: "barbole01", minutes: 40 },
  ],
  // Mirrors backend/scenario/service.py: outgoing player forced to 0, never omitted.
  scenario_rotation: [
    { player_id: "curryst01", minutes: 200 },
    { player_id: "acyqu01", minutes: 40 },
    { player_id: "barbole01", minutes: 0 },
  ],
  baseline_contribution: -1.83,
  scenario_contribution: -1.87,
  contribution_change: -0.04,
  provider_type: "historical_raptor_benchmark",
  provider_version: "historical-raptor-benchmark-v1",
  data_version: "fivethirtyeight-nba-raptor-2022-11-29",
  contribution_epistemic_type: "historical_benchmark",
  minutes_method: "heuristic-v1",
  minutes_assumptions: {
    editable: true,
    validated: false,
    total_minutes: 240,
    scenario_source: "heuristic",
  },
  allocation_repairs: [],
  explanation_factors: [],
  team_profile: [],
  historical_only: true,
  attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
  model_version: null,
};

const PLAYER_NAMES: Record<string, string> = {
  curryst01: "Stephen Curry",
  acyqu01: "Quincy Acy",
  barbole01: "Leandro Barbosa",
};
const playerLabel = (playerId: string) => PLAYER_NAMES[playerId] ?? playerId;

function renderComponent(response: ScenarioResponse = DEFAULT_RESPONSE) {
  const viewModel = toScenarioViewModel(response);
  render(
    <EditableScenarioMinutes
      viewModel={viewModel}
      contributionProvider="historical_benchmark"
      playerLabel={playerLabel}
    />,
  );
}

async function setMinutes(user: ReturnType<typeof userEvent.setup>, label: RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

/** The table starts read-only; editing (and thus the per-player inputs) only
 *  appears after this toggle — folded into the one table per the design-review
 *  fix for the previous duplicate-table issue. */
async function startEditing(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /edit scenario minutes/i }));
}

beforeEach(() => {
  scenarioMocks.postScenario.mockReset();
});

describe("EditableScenarioMinutes", () => {
  it("seeds one input per scenario-roster player, excluding the outgoing player, once editing starts", async () => {
    const user = userEvent.setup();
    renderComponent();
    expect(screen.queryByLabelText(/stephen curry scenario minutes/i)).not.toBeInTheDocument();

    await startEditing(user);
    expect(screen.getByLabelText(/stephen curry scenario minutes/i)).toHaveValue(200);
    expect(screen.getByLabelText(/quincy acy scenario minutes/i)).toHaveValue(40);
    expect(screen.queryByLabelText(/leandro barbosa scenario minutes/i)).not.toBeInTheDocument();
  });

  it("updates the displayed total and gates Recalculate as inputs change", async () => {
    const user = userEvent.setup();
    renderComponent();
    await startEditing(user);
    const recalculate = screen.getByRole("button", { name: /recalculate/i });
    expect(recalculate).not.toBeDisabled(); // seeded total already equals 240

    await setMinutes(user, /stephen curry scenario minutes/i, "150");
    expect(screen.getByText(/total is 190\.0/i)).toBeInTheDocument();
    expect(recalculate).toBeDisabled();

    await setMinutes(user, /quincy acy scenario minutes/i, "90");
    await waitFor(() => expect(recalculate).not.toBeDisabled());
  });

  it("recalculates with manual_minutes covering exactly the scenario roster and shows the edited result", async () => {
    scenarioMocks.postScenario.mockResolvedValue({
      ...DEFAULT_RESPONSE,
      scenario_contribution: -1.5,
      contribution_change: 0.33,
      minutes_assumptions: { ...DEFAULT_RESPONSE.minutes_assumptions, scenario_source: "manual" },
    });
    const user = userEvent.setup();
    renderComponent();
    await startEditing(user);

    await setMinutes(user, /stephen curry scenario minutes/i, "150");
    await setMinutes(user, /quincy acy scenario minutes/i, "90");
    await user.click(screen.getByRole("button", { name: /recalculate/i }));

    await waitFor(() => expect(scenarioMocks.postScenario).toHaveBeenCalledTimes(1));
    expect(scenarioMocks.postScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: "GSW",
        season: "2014-15",
        player_out_id: "barbole01",
        player_in_id: "acyqu01",
        contribution_provider: "historical_benchmark",
        manual_minutes: { curryst01: 150, acyqu01: 90 },
      }),
    );
    await waitFor(() => expect(screen.getByText("Edited result")).toBeInTheDocument());
  });

  it("Reset restores the default minutes and clears any edited result", async () => {
    scenarioMocks.postScenario.mockResolvedValue(DEFAULT_RESPONSE);
    const user = userEvent.setup();
    renderComponent();
    await startEditing(user);

    await setMinutes(user, /stephen curry scenario minutes/i, "150");
    await setMinutes(user, /quincy acy scenario minutes/i, "90");
    await user.click(screen.getByRole("button", { name: /recalculate/i }));
    await waitFor(() => expect(screen.getByText("Edited result")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /reset to default/i }));

    expect(screen.getByLabelText(/stephen curry scenario minutes/i)).toHaveValue(200);
    expect(screen.getByLabelText(/quincy acy scenario minutes/i)).toHaveValue(40);
    expect(screen.queryByText("Edited result")).not.toBeInTheDocument();
  });

  it("renders an actionable message for an INVALID_MANUAL_MINUTES error, not raw HTTP text", async () => {
    scenarioMocks.postScenario.mockRejectedValue(
      new ScenarioApiError({
        status: 422,
        code: "INVALID_MANUAL_MINUTES",
        message: "internal detail",
      }),
    );
    const user = userEvent.setup();
    renderComponent();
    await startEditing(user);
    await user.click(screen.getByRole("button", { name: /recalculate/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/check the total and each player/i);
  });
});
