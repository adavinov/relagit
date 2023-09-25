/* eslint-disable @typescript-eslint/no-var-requires */

const build = require('./dist/build_info.json');

module.exports = {
	packagerConfig: {
		name: 'RelaGit',
		appBundleId: 'com.rela.git',
		icon: build.env === 'development' ? './icons/gold' : './icons/dark'
	},
	makers: [
		{
			name: '@electron-forge/maker-squirrel',
			config: {
				name: 'electron_quick_start'
			}
		},
		{
			name: '@electron-forge/maker-zip',
			platforms: ['darwin']
		},
		{
			name: '@electron-forge/maker-deb',
			config: {}
		},
		{
			name: '@electron-forge/maker-rpm',
			config: {}
		}
	]
};
