<script lang="ts">
	import { ChevronLeft, ChevronRight } from "lucide-svelte";

	export let currentPage: number;
	export let hasNextPage: boolean;
	export let hasPrevPage: boolean;
	export let onPageChange: (page: number) => void;
</script>

<div
	class="pagination-controls"
	role="navigation"
	aria-label="Pagination controls"
>
	<button
		aria-label="Previous page"
		title="Previous page"
		class="pagination-info"
		disabled={!hasPrevPage}
		onclick={() => onPageChange(currentPage - 1)}
	>
		<ChevronLeft size="24" />
	</button>
	<div class="pagination-info" aria-label="Current page">
		{currentPage}
	</div>
	<button
		aria-label="Next page"
		title="Next page"
		class="pagination-info"
		disabled={!hasNextPage}
		onclick={() => onPageChange(currentPage + 1)}
	>
		<ChevronRight size="24" />
	</button>
</div>

<style lang="scss">
	.pagination-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}

	.pagination-info {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		font-size: 1.1em;
		font-weight: 500;
		background: none;
		border: none;
		color: var(--on-primary-color);
		border-radius: var(--default-border-radius);
		aspect-ratio: 1;
	}

	button.pagination-info:disabled {
		opacity: 0.5;
	}
	button:not(:disabled):hover {
		cursor: pointer;
		background-color: var(--primary-container-color);
	}
</style>
