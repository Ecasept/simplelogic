import { expect, it } from "vitest";
import { presets } from "./presets";
import { circuits } from "../../../playwright/circuits";
import { ZGraphData } from "$lib/util/shared/types";

it.each(Object.entries(presets))(
	"validates production preset %s",
	(_name, preset) => {
		expect(ZGraphData.safeParse(JSON.parse(preset.data)).error).toBeUndefined();
	},
);

it.each(Object.entries(circuits))(
	"validates test circuit %s",
	(_name, data) => {
		expect(ZGraphData.safeParse(JSON.parse(data)).error).toBeUndefined();
	},
);
