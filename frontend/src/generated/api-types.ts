/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: backend/api/openapi.json (backend/api/app.py's Pydantic models).
 * Regenerate with: pnpm run generate:api
 */
export interface paths {
    "/scenarios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Scenario */
        post: operations["create_scenario_scenarios_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/seasons/{season}/players": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Players */
        get: operations["list_players_seasons__season__players_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/seasons/{season}/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Teams */
        get: operations["list_teams_seasons__season__teams_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/seasons/{season}/teams/{team_id}/roster": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Team Roster */
        get: operations["get_team_roster_seasons__season__teams__team_id__roster_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /**
         * ContributionProviderChoice
         * @description The contribution providers exposed over HTTP (backend/providers/).
         *
         *     No default: the domain layer never falls back from one provider to
         *     another (backend/providers/base.py), so the API requires an explicit
         *     choice on every request rather than inventing one.
         * @enum {string}
         */
        ContributionProviderChoice: "historical_benchmark" | "synthetic";
        /**
         * EpistemicType
         * @description Epistemic category a value belongs to (scenario-engine.md §3, decision 0007 §2).
         * @enum {string}
         */
        EpistemicType: "historical_benchmark" | "synthetic_estimate" | "model_prediction" | "heuristic_assumption" | "deterministic_calculation" | "descriptive_interpretation";
        /** ExplanationFactorResponse */
        ExplanationFactorResponse: {
            /** Baseline Value */
            baseline_value: number;
            /** Change */
            change: number;
            /** Direction */
            direction: string;
            /** Importance */
            importance: number;
            /** Metric */
            metric: string;
            /** Scenario Value */
            scenario_value: number;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** PlayerSummaryResponse */
        PlayerSummaryResponse: {
            /** Name */
            name: string;
            /** Player Id */
            player_id: string;
        };
        /**
         * ProviderType
         * @description Contribution-provider implementation identity (decision 0007 §7).
         * @enum {string}
         */
        ProviderType: "historical_raptor_benchmark" | "synthetic";
        /** RosterPlayerResponse */
        RosterPlayerResponse: {
            /** Minutes */
            minutes: number;
            /** Name */
            name: string;
            /** Player Id */
            player_id: string;
        };
        /** RotationEntryResponse */
        RotationEntryResponse: {
            /** Minutes */
            minutes: number;
            /** Player Id */
            player_id: string;
        };
        /** ScenarioRequest */
        ScenarioRequest: {
            contribution_provider: components["schemas"]["ContributionProviderChoice"];
            /** Manual Minutes */
            manual_minutes?: {
                [key: string]: number;
            } | null;
            /** Player In Id */
            player_in_id: string;
            /** Player Out Id */
            player_out_id: string;
            /** Season */
            season: string;
            /** Team Id */
            team_id: string;
        };
        /** ScenarioResponse */
        ScenarioResponse: {
            /** Allocation Repairs */
            allocation_repairs: string[];
            /** Attribution */
            attribution: string[];
            /** Baseline Contribution */
            baseline_contribution: number;
            /** Baseline Rotation */
            baseline_rotation: components["schemas"]["RotationEntryResponse"][];
            /** Contribution Change */
            contribution_change: number;
            contribution_epistemic_type: components["schemas"]["EpistemicType"];
            /** Data Version */
            data_version: string;
            /** Explanation Factors */
            explanation_factors: components["schemas"]["ExplanationFactorResponse"][];
            /** Historical Only */
            historical_only: boolean;
            /** Minutes Assumptions */
            minutes_assumptions: {
                [key: string]: number | boolean | string;
            };
            /** Minutes Method */
            minutes_method: string;
            /** Model Version */
            model_version: string | null;
            /** Player In Id */
            player_in_id: string;
            /** Player Out Id */
            player_out_id: string;
            provider_type: components["schemas"]["ProviderType"];
            /** Provider Version */
            provider_version: string;
            /** Scenario Contribution */
            scenario_contribution: number;
            /** Scenario Rotation */
            scenario_rotation: components["schemas"]["RotationEntryResponse"][];
            /** Season */
            season: string;
            /** Team Id */
            team_id: string;
            /** Team Profile */
            team_profile: components["schemas"]["TeamProfileCategoryResponse"][];
        };
        /** SeasonPlayersResponse */
        SeasonPlayersResponse: {
            /** Players */
            players: components["schemas"]["PlayerSummaryResponse"][];
            /** Season */
            season: string;
        };
        /** TeamProfileCategoryResponse */
        TeamProfileCategoryResponse: {
            /** Baseline Value */
            baseline_value: number;
            /** Category */
            category: string;
            /** Change */
            change: number;
            /** Direction */
            direction: string;
            epistemic_type: components["schemas"]["EpistemicType"];
            /** Scenario Value */
            scenario_value: number;
        };
        /** TeamRosterResponse */
        TeamRosterResponse: {
            /** Players */
            players: components["schemas"]["RosterPlayerResponse"][];
            /** Season */
            season: string;
            /** Team Id */
            team_id: string;
        };
        /** TeamsResponse */
        TeamsResponse: {
            /** Season */
            season: string;
            /** Teams */
            teams: string[];
        };
        /** ValidationError */
        ValidationError: {
            /** Context */
            ctx?: Record<string, never>;
            /** Input */
            input?: unknown;
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    create_scenario_scenarios_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScenarioRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScenarioResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_players_seasons__season__players_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                season: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeasonPlayersResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_teams_seasons__season__teams_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                season: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TeamsResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_team_roster_seasons__season__teams__team_id__roster_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                season: string;
                team_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TeamRosterResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
