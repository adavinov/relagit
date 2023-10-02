import { createSignal, For, Show } from 'solid-js';

import highlighter, { langFrom } from '@modules/highlighter';
import { createStoreListener } from '@stores/index';
import { DIFF_CODES } from '@modules/git/constants';
import { parseDiff } from '@modules/git/diff';
import LocationStore from '@stores/location';
import { error } from '@modules/logger';
import { t } from '@app/modules/i18n';
import FileStore from '@stores/files';
import * as Git from '@modules/git';

import EmptyState, { EMPTY_STATE_IMAGES } from '@ui/Common/EmptyState';
import Icon from '@ui/Common/Icon';

import type { GitDiff } from 'parse-git-diff';

type GitBlame = Awaited<ReturnType<(typeof Git)['Blame']>>;

import './index.scss';

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
export const BINARY_EXTENSIONS = ['.DS_Store', '.exe', '.dll', '.so', '.dylib', '.o', '.a'];

const extname = (file: string) => {
	return file.split('.').length > 1 ? `.${file.split('.').pop()}` : file;
};

const totalLines = (file: GitDiff['files'][number]) => {
	return file.chunks.reduce((acc, curr) => {
		return acc + curr.changes.length;
	}, 0);
};

const status = (e: 'UnchangedLine' | 'AddedLine' | 'DeletedLine') => {
	switch (e) {
		case 'UnchangedLine':
			return 'unchanged';
		case 'AddedLine':
			return 'added';
		case 'DeletedLine':
			return 'deleted';
	}
};

export interface ICodeViewProps {
	file: string;
	repository: string;
}

const dealWithTabs = (line: string) => {
	return line.replaceAll(/(?<!\S)(\t|  )/g, '<span class="pl-tab">  </span>');
};

export default (props: ICodeViewProps) => {
	const [showOverridden, setShowOverridden] = createSignal<boolean>(false);
	const [shouldShow, setShouldShow] = createSignal<boolean>(false);
	const [diff, setDiff] = createSignal<GitDiff | null | true>();
	const [threw, setThrew] = createSignal<Error | null>(null);
	const [content, setContent] = createSignal<string>('');
	const [blame, setBlame] = createSignal<GitBlame>();

	const [switching, setSwitching] = createSignal<boolean>(false);
	const [showCommit, setShowCommit] = createSignal<boolean>(false);

	const changes = createStoreListener([FileStore], () =>
		FileStore.getFilesByRepositoryPath(props.repository)
	);
	const commit = createStoreListener([LocationStore], () => LocationStore.selectedCommitFile);
	const historyOpen = createStoreListener([LocationStore], () => LocationStore.historyOpen);
	const blameOpen = createStoreListener([LocationStore], () => LocationStore.blameOpen);

	createStoreListener([LocationStore, FileStore], async () => {
		try {
			if (LocationStore.historyOpen) {
				setShowCommit(true);

				if (!LocationStore.selectedCommitFile) {
					return;
				}

				setDiff(LocationStore.selectedCommitFile?.diff);
				setShouldShow(totalLines(LocationStore.selectedCommitFile?.diff?.files?.[0]) < 100);
				setShowOverridden(false);
				setShowCommit(false);
				setThrew(null);

				return;
			}

			if (!props.file || !props.repository) {
				return;
			}

			setSwitching(true);
			setShowOverridden(false);
			setShowCommit(false);
			setShouldShow(false);
			setThrew(null);

			let _diff: string | null = null;
			let contents: string | null = null;

			try {
				contents = await Git.Content(props.file, props.repository);
				_diff = await Git.Diff(props.file, props.repository);
			} catch (e) {
				setThrew(e);

				setSwitching(false);

				error(e);
			}

			try {
				setBlame(await Git.Blame(props.repository, props.file));
			} catch (e) {
				setBlame(null);

				error(e);
			}

			setSwitching(false);

			setContent(highlighter(contents, langFrom(props.file || '')));

			if (_diff === DIFF_CODES.REMOVE_ALL) {
				setDiff(null);
			} else if (_diff === DIFF_CODES.ADD_ALL) {
				setDiff(true);
			} else {
				const parsed = parseDiff(_diff);
				setDiff(parsed);
			}

			if (!diff() || diff() === true) {
				setShouldShow(true);
			} else {
				setShouldShow(totalLines((diff() as GitDiff)?.files?.[0]) < 100);
			}
		} catch (e) {
			setThrew(e);

			setSwitching(false);

			console.error(e);
		}
	});

	return (
		<Show
			when={!showCommit()}
			fallback={
				<EmptyState
					detail={t('codeview.noCommit')}
					hint={t('codeview.noCommitHint')}
					image={{
						light: EMPTY_STATE_IMAGES.L_NOTHING_HERE,
						dark: EMPTY_STATE_IMAGES.D_NOTHING_HERE
					}}
				/>
			}
		>
			<Show
				when={!switching()}
				fallback={
					<EmptyState
						detail={t('codeview.loading')}
						hint={t('codeview.loadingHint')}
						image={{
							light: EMPTY_STATE_IMAGES.L_NOTHING_HERE,
							dark: EMPTY_STATE_IMAGES.D_NOTHING_HERE
						}}
					/>
				}
			>
				<Show
					when={!threw()}
					fallback={
						<EmptyState
							detail={t('codeview.errorHint')}
							hint={threw().message}
							image={{
								light: EMPTY_STATE_IMAGES.L_ERROR,
								dark: EMPTY_STATE_IMAGES.D_ERROR
							}}
						/>
					}
				>
					<Show
						when={(props.file && props.repository) || (historyOpen() && commit())}
						fallback={
							<>
								<Show
									when={props.repository}
									fallback={
										<EmptyState
											detail="No repository selected."
											hint={
												'See over there where it says "No Repository Selected"? Yeah, click that.'
											}
											image={{
												light: EMPTY_STATE_IMAGES.L_NOTHING_HERE,
												dark: EMPTY_STATE_IMAGES.D_NOTHING_HERE
											}}
										/>
									}
								>
									<Show
										when={changes()?.length}
										fallback={
											<EmptyState
												detail={t('codeview.noChanges')}
												hint={t('codeview.noChangesHint')}
												image={{
													light: EMPTY_STATE_IMAGES.L_NOTHING_HERE,
													dark: EMPTY_STATE_IMAGES.D_NOTHING_HERE
												}}
											/>
										}
									>
										<EmptyState
											detail={t('codeview.noFile')}
											hint={t('codeview.noFileHint')}
											image={{
												light: EMPTY_STATE_IMAGES.L_NOTHING_HERE,
												dark: EMPTY_STATE_IMAGES.D_NOTHING_HERE
											}}
										/>
									</Show>
								</Show>
							</>
						}
					>
						<Show
							when={
								!IMAGE_EXTENSIONS.includes(
									extname(props.file || commit()?.filename)
								) &&
								!BINARY_EXTENSIONS.includes(
									extname(props.file || commit()?.filename)
								)
							}
							fallback={
								<>
									<Show when={IMAGE_EXTENSIONS.includes(extname(props.file))}>
										<div class="codeview-image">
											{/* TODO */}
											<div class="codeview-image__container removed">
												<Icon name="image" />
											</div>
											<div class="codeview-image__container added">
												<Icon name="image" />
											</div>
										</div>
									</Show>
									<Show when={BINARY_EXTENSIONS.includes(extname(props.file))}>
										<EmptyState
											detail={t('codeview.binary')}
											hint={t('codeview.binaryHint')}
											image={{
												light: EMPTY_STATE_IMAGES.L_ERROR,
												dark: EMPTY_STATE_IMAGES.D_ERROR
											}}
										/>
									</Show>
								</>
							}
						>
							<Show
								when={shouldShow() || showOverridden()}
								fallback={
									<>
										<EmptyState
											detail={t('codeview.tooBig')}
											hint={t('codeview.tooBigHint')}
											actions={[
												{
													label: 'Show',
													type: 'brand',
													onClick: () => {
														setShowOverridden(true);
													}
												}
											]}
											image={{
												light: EMPTY_STATE_IMAGES.L_POWER,
												dark: EMPTY_STATE_IMAGES.D_POWER
											}}
										/>
									</>
								}
							>
								<pre class="codeview">
									<Show
										when={diff() !== true && diff() !== null}
										fallback={
											<For each={content().split('\n')}>
												{(line, index) => {
													const status = () =>
														diff() ? 'added' : 'deleted';

													const lineBlame = blame()?.[index()];

													return (
														<div class={`codeview__line ${status()}`}>
															<div
																class="codeview__line__number"
																style={{
																	'min-width': `calc(${
																		String(
																			content().split('\n')
																				.length
																		).length
																	} *  35px / 3px)`
																}}
															>
																{index()}
															</div>

															<div
																class={`codeview__line__indicator ${status()}`}
															>
																{status() === 'added' ? '+' : '-'}
															</div>
															<div
																class="codeview__line__content"
																innerHTML={dealWithTabs(line)}
															></div>

															<Show when={blameOpen() && lineBlame}>
																<div
																	{...props}
																	class="codeview__line__blame"
																>
																	{lineBlame.author},{' '}
																	{lineBlame.message}
																</div>
															</Show>
														</div>
													);
												}}
											</For>
										}
									>
										<For each={(diff() as GitDiff)?.files?.[0]?.chunks}>
											{(chunk) => {
												const from =
													chunk.type == 'Chunk'
														? chunk.fromFileRange
														: { start: 0, lines: 0 };
												const to = chunk.toFileRange;

												const isLastChunk =
													(diff() as GitDiff).files?.[0]?.chunks?.indexOf(
														chunk
													) ===
													(diff() as GitDiff).files?.[0]?.chunks?.length -
														1;
												const isFirstChunk =
													(diff() as GitDiff).files?.[0]?.chunks?.indexOf(
														chunk
													) === 0;

												return (
													<>
														<div class="codeview__line message">
															<div
																class="codeview__line__number"
																style={{
																	'min-width': `calc(${
																		String(
																			content().split('\n')
																				.length
																		).length
																	} * 70px / 3px)`
																}}
															>
																<Show
																	when={isFirstChunk}
																	fallback={<Icon name="fold" />}
																>
																	<Icon name="fold-up" />
																</Show>
															</div>
															<div class="codeview__line__content">
																@@ -{from.start},{from.lines} +
																{to.start},{to.lines} @@{' '}
																{chunk.context}
															</div>
														</div>
														<For each={chunk.changes}>
															{(change) => {
																const line_number_one =
																	// @ts-expect-error - bad types
																	change.lineBefore || '';
																const line_number_two =
																	// @ts-expect-error - bad types
																	change.lineAfter || '';

																if (change.type === 'MessageLine')
																	return null;

																const lineBlame =
																		blame()?.[line_number_one],
																	lineStatus = status(
																		change.type
																	);

																return (
																	<div
																		class={`codeview__line ${lineStatus}`}
																	>
																		<div
																			class="codeview__line__number"
																			style={{
																				'min-width': `calc(${
																					String(
																						content().split(
																							'\n'
																						).length
																					).length
																				} * 35px / 3px)`
																			}}
																		>
																			{line_number_one}
																		</div>
																		<div
																			class="codeview__line__number"
																			style={{
																				'min-width': `calc(${
																					String(
																						content().split(
																							'\n'
																						).length
																					).length
																				} * 35px / 3px)`
																			}}
																		>
																			{line_number_two}
																		</div>
																		<div
																			class={`codeview__line__indicator ${lineStatus}`}
																		>
																			{lineStatus === 'added'
																				? '+'
																				: lineStatus ===
																				  'deleted'
																				? '-'
																				: ' '}
																		</div>
																		<div
																			class="codeview__line__content"
																			innerHTML={dealWithTabs(
																				highlighter(
																					change.content,
																					langFrom(
																						props.file ||
																							commit()
																								?.filename
																					)
																				)
																			)}
																		></div>
																		<Show
																			when={
																				blameOpen() &&
																				lineBlame
																			}
																		>
																			<div
																				{...props}
																				class="codeview__line__blame"
																			>
																				{lineBlame.author},{' '}
																				{lineBlame.message}
																			</div>
																		</Show>
																	</div>
																);
															}}
														</For>
														<Show when={isLastChunk}>
															<div class="codeview__line message">
																<div
																	class="codeview__line__number"
																	style={{
																		'min-width': `calc(${
																			String(
																				content().split(
																					'\n'
																				).length
																			).length
																		} * 70px / 3px)`
																	}}
																>
																	<Icon name="fold-down" />
																</div>
																<div class="codeview__line__content"></div>
															</div>
														</Show>
													</>
												);
											}}
										</For>
									</Show>
								</pre>
							</Show>
						</Show>
					</Show>
				</Show>
			</Show>
		</Show>
	);
};
