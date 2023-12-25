import SettingsStore from '@app/stores/settings';

import { Git } from './core';

const path = window.Native.DANGEROUS__NODE__REQUIRE('path');

export const Clone = async (url: string, directory: string) => {
	const result = await Git({
		directory: path.join(directory, '..'),
		command: 'clone',
		args: [url, path.basename(directory)]
	});

	SettingsStore.setSetting('repositories', [
		...SettingsStore.getSetting('repositories'),
		directory
	]);

	window._triggerWorkflow('repository_add', directory);

	return result;
};
