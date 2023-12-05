/** @type {import('prettier').Config} */
const config = {
	plugins: ['@trivago/prettier-plugin-sort-imports'],
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	tabWidth: 4,
	importOrderParserPlugins: ['importAssertions', 'typescript', 'jsx', 'json'],
	bracketSpacing: true,
	importOrder: [
		'^(node:)?(_http_agent|_http_client|_http_common|_http_incoming|_http_outgoing|_http_server|_stream_duplex|_stream_passthrough|_stream_readable|_stream_transform|_stream_wrap|_stream_writable|_tls_common|_tls_wrap|assert|assert\\/strict|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|diagnostics_channel|dns|dns\\/promises|domain|events|fs|fs\\/promises|http|http2|https|inspector|inspector\\/promises|module|net|os|path|path\\/posix|path\\/win32|perf_hooks|process|punycode|querystring|readline|readline\\/promises|repl|stream|stream\\/consumers|stream\\/promises|stream\\/web|string_decoder|sys|timers|timers\\/promises|tls|trace_events|tty|url|util|util\\/types|v8|vm|wasi|worker_threads|zlib)',
		'^(~\\/|@)((?!ui)app|common|modules|stores)',
		'^@ui/(.+)$',
		'^(\\.+)\\/(?!index\\.scss|app\\.scss).+',
		'^(\\.+)\\/.+css'
	],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true
};

export default config;
