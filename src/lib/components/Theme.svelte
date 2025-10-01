<style lang="scss">
	/* ==== Theme Definitions ==== */

	@mixin theme-light {
		--surface-color: rgb(126, 190, 113);
		--primary-container-color: #a7daa4;
		--primary-color: #c1dfbf;
		--primary-highlight-color: #a1bf9f;
		--primary-disabled-color: gray;
		--on-surface-color: black;
		--on-primary-color: black;
		--on-primary-container-color: black;
		--error-color: red;
		--primary-border-color: black;
		--primary-container-border-color: var(--primary-border-color);
		--selected-outline-color: rgb(0, 159, 233);

		--danger-color: var(--error-color);
		--on-danger-color: black;
		--danger-border-color: darkred;
		--danger-highlight-color: #ff3333;
		--success-color: rgba(39, 92, 3, 0.1);
		--on-success-color: #334703;
		--highlight-filter: rgba(0, 0, 0, 0.1);

		--canvas-background-color: rgb(238, 255, 223);
		--component-outline-color: black;
		--component-background-color: green;
		--on-component-background-color: var(--component-outline-color);
		--delete-color: red;
		--on-delete-color: white;
		--component-delete-color: var(--delete-color);
		--handle-connect-color: purple;
		--shadow-color: gray;
		--surface-border-color: #596858;
		--surface-highlight-color: var(--primary-container-color);

		--circuit-item-separator-color: #00000020;

		/* Simulation sidebar colors */
		--surface-variant-color: #f0f4ed;
		--on-surface-variant-color: #6a6a6a;
		--outline-variant-color: #c8d1c0;
		--success-container-color: #e8f5e8;
		--processing-background-color: #f8f9fa;
		--processing-border-color: #e0e0e0;

		--on-component-outline-color: var(--primary-color);
	}

	@mixin theme-dark {
		--surface-color: #171d16;
		--primary-container-color: #2e3426;
		--primary-color: #304302;
		--primary-highlight-color: #48610e;
		--primary-disabled-color: #707070;
		--on-surface-color: #b9de6f;
		--on-primary-color: #b9de6f;
		--on-primary-container-color: #b9de6f;
		--error-color: #ff6e6e;
		--primary-border-color: #738b43; // Darker version of on-primary-color
		--primary-container-border-color: var(--primary-border-color);
		--selected-outline-color: rgb(0, 159, 233);

		--danger-color: rgba(255, 110, 110, 0.1);
		--on-danger-color: #ff6e6e;
		--danger-border-color: var(--on-danger-color);
		--danger-highlight-color: rgba(255, 110, 110, 0.2);
		--success-color: rgba(50, 120, 4, 0.1);
		--on-success-color: #6b9606;

		--highlight-filter: rgba(255, 255, 255, 0.1);

		--canvas-background-color: #2c2c2c;
		--component-outline-color: rgb(189, 196, 171);
		--component-background-color: #4f7000;
		--on-component-background-color: var(--component-outline-color);
		--delete-color: red;
		--on-delete-color: white;
		--component-delete-color: var(--delete-color);
		--handle-connect-color: rgb(184, 0, 184);
		--shadow-color: #181818;
		--surface-border-color: #3d4832;
		--surface-highlight-color: var(--primary-color);

		--circuit-item-separator-color: #ffffff20;

		/* Simulation sidebar colors */
		--surface-variant-color: #232823;
		--on-surface-variant-color: #8a9580;
		--outline-variant-color: #3d4832;
		--success-container-color: rgba(50, 120, 4, 0.15);
		--processing-background-color: #1f251e;
		--processing-border-color: #3d4832;

		--on-component-outline-color: black;
	}

	/* ==== Apply theme ==== */

	// Explicit light theme selection
	:global(:root:has(.theme-host.theme-light)) {
		@include theme-light;
	}

	// Explicit dark theme selection
	:global(:root:has(.theme-host.theme-dark)) {
		@include theme-dark;
	}

	/* ==== System theme selection ==== */
	/* for when the javascript has not run yet */

	// System dark theme preference
	@media (prefers-color-scheme: dark) {
		:global(:root:not(:has(.theme-host.user-theme))) {
			@include theme-dark;
		}
	}

	// System light theme preference
	@media not (prefers-color-scheme: dark) {
		:global(:root:not(:has(.theme-host.user-theme))) {
			@include theme-light;
		}
	}
</style>
