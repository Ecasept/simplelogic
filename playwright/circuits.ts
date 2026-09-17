import multiconnected from "./circuits/multiconnected.json" with { type: "json" };
import singleAnd from "./circuits/singleAnd.json" with { type: "json" };
import singleOR from "./circuits/singleOR.json" with { type: "json" };
import rippleCarryAdder from "./circuits/rippleCarryAdder.json" with { type: "json" };
import SR_NOR_latch from "./circuits/SR_NOR_latch.json" with { type: "json" };
import wireTest from "./circuits/wireTest.json" with { type: "json" };
import areaSelectTest from "./circuits/areaSelectTest.json" with { type: "json" };

export const circuits = {
	multiconnected: JSON.stringify(multiconnected),
	singleAnd: JSON.stringify(singleAnd),
	singleOR: JSON.stringify(singleOR),
	rippleCarryAdder: JSON.stringify(rippleCarryAdder),
	SR_NOR_latch: JSON.stringify(SR_NOR_latch),
	wireTest: JSON.stringify(wireTest),
	areaSelectTest: JSON.stringify(areaSelectTest),
};
