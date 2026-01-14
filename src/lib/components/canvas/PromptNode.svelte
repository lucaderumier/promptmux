<script lang="ts">
	/**
	 * The prompt input node (left side of the canvas)
	 */
	interface Props {
		prompt: string;
		onPromptChange?: (prompt: string) => void;
	}

	let { prompt = $bindable(), onPromptChange }: Props = $props();
</script>

<div class="prompt-node bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 min-w-[300px]">
	<label class="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
	<textarea
		bind:value={prompt}
		class="w-full h-32 bg-gray-900 text-white rounded border border-gray-600 p-2 resize-none focus:outline-none focus:border-blue-500"
		placeholder="Enter your prompt here..."
	></textarea>
</div>
