import multiconnected from "./circuits/multiconnected.json";
import singleAnd from "./circuits/singleAnd.json";
import singleOR from "./circuits/singleOR.json";
import rippleCarryAdder from "./circuits/rippleCarryAdder.json";
import SR_NOR_latch from "./circuits/SR_NOR_latch.json";
import wireTest from "./circuits/wireTest.json";
import areaSelectTest from "./circuits/areaSelectTest.json";

export const circuits = {
	multiconnected: JSON.stringify(multiconnected),
	singleAnd: JSON.stringify(singleAnd),
	singleOR: JSON.stringify(singleOR),
	rippleCarryAdder: JSON.stringify(rippleCarryAdder),
	SR_NOR_latch: JSON.stringify(SR_NOR_latch),
	wireTest: JSON.stringify(wireTest),
	areaSelectTest: JSON.stringify(areaSelectTest),
};
