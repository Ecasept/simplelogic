import optimizedSevenSegmentDisplay from "./presets/optimizedSevenSegmentDisplay.json";
import rippleCarryAdder from "./presets/rippleCarryAdder.json";
import srNorLatch from "./presets/srNorLatch.json";
import fullAdder from "./presets/fullAdder.json";
import halfAdder from "./presets/halfAdder.json";
import binaryDecoder from "./presets/binaryDecoder.json";
import twoToOneMultiplexer from "./presets/twoToOneMultiplexer.json";

export const presets = {
	optimizedSevenSegmentDisplay: {
		id: 7,
		name: "7-Segment Display",
		img: "/presets/optimized_seven_segment_display",
		data: JSON.stringify(optimizedSevenSegmentDisplay),
	},
	rippleCarryAdder: {
		id: 1,
		name: "Ripple Carry Adder",
		img: "/presets/ripple_carry_adder",
		data: JSON.stringify(rippleCarryAdder),
	},
	srNorLatch: {
		id: 2,
		name: "SR NOR Latch",
		img: "/presets/sr_nor_latch",
		data: JSON.stringify(srNorLatch),
	},
	fullAdder: {
		id: 3,
		name: "Full Adder",
		img: "/presets/full_adder",
		data: JSON.stringify(fullAdder),
	},
	halfAdder: {
		id: 4,
		name: "Half Adder",
		img: "/presets/half_adder",
		data: JSON.stringify(halfAdder),
	},
	binaryDecoder: {
		id: 5,
		name: "Binary Decoder",
		img: "/presets/binary_decoder",
		data: JSON.stringify(binaryDecoder),
	},
	twoToOneMultiplexer: {
		id: 6,
		name: "2:1 Multiplexer",
		img: "/presets/2to1_multiplexer",
		data: JSON.stringify(twoToOneMultiplexer),
	},
};
