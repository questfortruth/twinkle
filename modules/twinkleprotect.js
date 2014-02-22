//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinkleprotect.js: Protect/RPP module
 ****************************************
 * Mode of invocation:     Tab ("PP"/"RPP")
 * Active on:              Non-special pages
 * Config directives in:   TwinkleConfig
 */

// Note: a lot of code in this module is re-used/called by batchprotect.

Twinkle.protect = function twinkleprotect() {
	if ( mw.config.get('wgNamespaceNumber') < 0 ) {
		return;
	}

	Twinkle.addPortletLink(Twinkle.protect.callback, Morebits.userIsInGroup('sysop') ? "保護" : "保護", "tw-rpp",
		Morebits.userIsInGroup('sysop') ? "保護頁面" : "請求保護頁面" );
};

Twinkle.protect.callback = function twinkleprotectCallback() {
	Twinkle.protect.protectionLevel = null;

	var Window = new Morebits.simpleWindow( 620, 530 );
	Window.setTitle( Morebits.userIsInGroup( 'sysop' ) ? "施行或請求保護頁面" : "請求保護頁面" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "保護模板", "Template:Protection templates" );
	Window.addFooterLink( "保護方針", "WP:PROT" );
	Window.addFooterLink( "Twinkle幫助", "WP:TW/DOC#protect" );

	var form = new Morebits.quickForm( Twinkle.protect.callback.evaluate );
	var actionfield = form.append( {
			type: 'field',
			label: '操作類型'
		} );
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		actionfield.append( {
				type: 'radio',
				name: 'actiontype',
				event: Twinkle.protect.callback.changeAction,
				list: [
					{
						label: '保護頁面',
						value: 'protect',
						checked: true
					}
				]
			} );
	}
	actionfield.append( {
			type: 'radio',
			name: 'actiontype',
			event: Twinkle.protect.callback.changeAction,
			list: [
				{
					label: '請求保護頁面',
					value: 'request',
					tooltip: '如果您想在WP:RFPP請求保護此頁' + (Morebits.userIsInGroup('sysop') ? '而不是自行完成。' : '。'),
					checked: !Morebits.userIsInGroup('sysop')
				},
				{
					label: '用保護模板標記此頁',
					value: 'tag',
					tooltip: '可以用此為頁面加上合適的保護模板。',
					disabled: mw.config.get('wgArticleId') === 0
				}
			]
		} );

	form.append({ type: 'field', label: '預設', name: 'field_preset' });
	form.append({ type: 'field', label: '1', name: 'field1' });
	form.append({ type: 'field', label: '2', name: 'field2' });

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the controls
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.actiontype[0].dispatchEvent( evt );

	// get current protection level asynchronously
	if (Morebits.userIsInGroup('sysop')) {
		Morebits.wiki.actionCompleted.postfix = false;  // avoid Action: completed notice
		Morebits.status.init($('div[name="currentprot"] span').last()[0]);
	}
	Twinkle.protect.fetchProtectionLevel();
};

// Current protection level in a human-readable format
// (a string, or null if no protection; only filled for sysops)
Twinkle.protect.protectionLevel = null;  
// Contains the current protection level in an object
// Once filled, it will look something like:
// { edit: { level: "sysop", expiry: <some date>, cascade: true }, ... }
Twinkle.protect.currentProtectionLevels = {};

Twinkle.protect.fetchProtectionLevel = function twinkleprotectFetchProtectionLevel() {

	var api = new mw.Api();
	api.get({
		format: 'json',
		indexpageids: true,
		action: 'query',
		prop: 'info',
		inprop: 'protection',
		titles: mw.config.get('wgPageName')
	})
	.done(function(data){
		var pageid = data.query.pageids[0];
		var page = data.query.pages[pageid];
		var result = [];
		var current = {};

		var updateResult = function(label, level, expiry, cascade) {
			// for sysops, stringify, so they can base their decision on existing protection
			if (Morebits.userIsInGroup('sysop')) {
				var boldnode = document.createElement('b');
				boldnode.textContent = label + "：" + level;
				result.push(boldnode);
				if (expiry === 'infinity') {
					result.push("（無限期）");
				} else {
					result.push("（過期：" + new Date(expiry).toUTCString() + "）");
				}
				if (cascade) {
					result.push("（聯鎖）");
				}
			}
		};

		$.each(page.protection, function( index, protection ) {
			if (protection.type !== "aft") {
				current[protection.type] = {
					level: protection.level,
					expiry: protection.expiry,
					cascade: protection.cascade === ''
				};
				updateResult( Morebits.string.toUpperCaseFirstChar(protection.type), protection.level, protection.expiry, protection.cascade );
			}
		});

		// show the protection level to sysops
		if (Morebits.userIsInGroup('sysop')) {
			if (!result.length) {
				var boldnode = document.createElement('b');
				boldnode.textContent = "無保護";
				result.push(boldnode);
			}
			Twinkle.protect.protectionLevel = result;
			Morebits.status.init($('div[name="currentprot"] span').last()[0]);
			Morebits.status.info("當前保護等級", Twinkle.protect.protectionLevel);
		}

		Twinkle.protect.currentProtectionLevels = current;
	});
};

Twinkle.protect.callback.changeAction = function twinkleprotectCallbackChangeAction(e) {
	var field_preset;
	var field1;
	var field2;
	var isTemplate = mw.config.get("wgNamespaceNumber") === 10 || mw.config.get("wgNamespaceNumber") === 828;

	switch (e.target.values) {
		case 'protect':
			field_preset = new Morebits.quickForm.element({ type: 'field', label: '預設', name: 'field_preset' });
			field_preset.append({
					type: 'select',
					name: 'category',
					label: '選擇預設：',
					event: Twinkle.protect.callback.changePreset,
					list: (mw.config.get('wgArticleId') ?
						Twinkle.protect.protectionTypes :
						Twinkle.protect.protectionTypesCreate)
				});

			field2 = new Morebits.quickForm.element({ type: 'field', label: '保護選項', name: 'field2' });
			field2.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			// for existing pages
			if (mw.config.get('wgArticleId')) {
				field2.append({
						type: 'checkbox',
						name: 'editmodify',
						event: Twinkle.protect.formevents.editmodify,
						list: [
							{
								label: '修改編輯權限',
								value: 'editmodify',
								tooltip: '如果此項被關閉，編輯權限將不被修改。',
								checked: true
							}
						]
					});
				var editlevel = field2.append({
						type: 'select',
						name: 'editlevel',
						label: '編輯權限：',
						event: Twinkle.protect.formevents.editlevel
					});
				editlevel.append({
						type: 'option',
						label: '（站點默認）',
						value: 'all'
					});
				editlevel.append({
						type: 'option',
						label: '禁止未註冊用戶',
						value: 'autoconfirmed'
					});
				editlevel.append({
						type: 'option',
						label: '僅管理員',
						value: 'sysop',
						selected: true
					});
				field2.append({
						type: 'select',
						name: 'editexpiry',
						label: '終止時間：',
						event: function(e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						list: [
							{ label: '1小時', value: '1 hour' },
							{ label: '2小時', value: '2 hours' },
							{ label: '3小時', value: '3 hours' },
							{ label: '6小時', value: '6 hours' },
							{ label: '12小時', value: '12 hours' },
							{ label: '1日', value: '1 day' },
							{ label: '2日', selected: true, value: '2 days' },
							{ label: '3日', value: '3 days' },
							{ label: '4日', value: '4 days' },
							{ label: '1週', value: '1 week' },
							{ label: '2週', value: '2 weeks' },
							{ label: '1月', value: '1 month' },
							{ label: '2月', value: '2 months' },
							{ label: '3月', value: '3 months' },
							{ label: '1年', value: '1 year' },
							{ label: '無限期', value:'indefinite' },
							{ label: '自定義…', value: 'custom' }
						]
					});
				field2.append({
						type: 'checkbox',
						name: 'movemodify',
						event: Twinkle.protect.formevents.movemodify,
						list: [
							{
								label: '修改移動權限',
								value: 'movemodify',
								tooltip: '如果此項被關閉，移動權限將不被修改。',
								checked: true
							}
						]
					});
				var movelevel = field2.append({
						type: 'select',
						name: 'movelevel',
						label: '移動權限：',
						event: Twinkle.protect.formevents.movelevel
					});
				movelevel.append({
						type: 'option',
						label: '（站點默認）',
						value: 'all'
					});
				movelevel.append({
						type: 'option',
						label: '禁止未註冊用戶',
						value: 'autoconfirmed'
					});
				movelevel.append({
						type: 'option',
						label: '僅管理員',
						value: 'sysop',
						selected: true
					});
				field2.append({
						type: 'select',
						name: 'moveexpiry',
						label: '終止時間：',
						event: function(e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						list: [
							{ label: '1小時', value: '1 hour' },
							{ label: '2小時', value: '2 hours' },
							{ label: '3小時', value: '3 hours' },
							{ label: '6小時', value: '6 hours' },
							{ label: '12小時', value: '12 hours' },
							{ label: '1日', value: '1 day' },
							{ label: '2日', value: '2 days' },
							{ label: '3日', value: '3 days' },
							{ label: '4日', value: '4 days' },
							{ label: '1週', value: '1 week' },
							{ label: '2週', value: '2 weeks' },
							{ label: '1月', selected: true, value: '1 month' },
							{ label: '2月', value: '2 months' },
							{ label: '3月', value: '3 months' },
							{ label: '1年', value: '1 year' },
							{ label: '無限期', value:'indefinite' },
							{ label: '自定義…', value: 'custom' }
						]
					});
			} else {  // for non-existing pages
				var createlevel = field2.append({
						type: 'select',
						name: 'createlevel',
						label: '創建權限：',
						event: Twinkle.protect.formevents.createlevel
					});
				createlevel.append({
						type: 'option',
						label: '全部',
						value: 'all'
					});
				createlevel.append({
						type: 'option',
						label: '禁止未註冊用戶',
						value: 'autoconfirmed'
					});
				createlevel.append({
						type: 'option',
						label: '僅管理員',
						value: 'sysop',
						selected: true
					});
				field2.append({
						type: 'select',
						name: 'createexpiry',
						label: '終止時間：',
						event: function(e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						list: [
							{ label: '1小時', selected: true, value: '1 hour' },
							{ label: '2小時', value: '2 hours' },
							{ label: '3小時', value: '3 hours' },
							{ label: '6小時', value: '6 hours' },
							{ label: '12小時', value: '12 hours' },
							{ label: '1日', value: '1 day' },
							{ label: '2日', value: '2 days' },
							{ label: '3日', value: '3 days' },
							{ label: '4日', value: '4 days' },
							{ label: '1週', value: '1 week' },
							{ label: '2週', value: '2 weeks' },
							{ label: '1月', value: '1 month' },
							{ label: '2月', value: '2 months' },
							{ label: '3月', value: '3 months' },
							{ label: '1年', value: '1 year' },
							{ label: '無限期', value:'indefinite' },
							{ label: '自定義…', value: 'custom' }
						]
					});
			}
			field2.append({
					type: 'textarea',
					name: 'protectReason',
					label: '理由（保護日誌）：'
				});
			if (!mw.config.get('wgArticleId')) {  // tagging isn't relevant for non-existing pages
				break;
			}
			/* falls through */
		case 'tag':
			field1 = new Morebits.quickForm.element({ type: 'field', label: '標記選項', name: 'field1' });
			field1.append( {
					type: 'select',
					name: 'tagtype',
					label: '選擇保護模板：',
					list: Twinkle.protect.protectionTags,
					event: Twinkle.protect.formevents.tagtype
				} );
			field1.append( {
					type: 'checkbox',
					list: [
						{
							name: 'small',
							label: '使用圖標（small=yes）',
							tooltip: '將給模板加上|small=yes參數，顯示成右上角的一把掛鎖。',
							checked: true
						},
						{
							name: 'noinclude',
							label: '用<noinclude>包裹保護模板',
							tooltip: '將保護模板包裹在&lt;noinclude&gt;中',
							checked: (mw.config.get('wgNamespaceNumber') === 10)
						}
					]
				} );
			break;

		case 'request':
			field_preset = new Morebits.quickForm.element({ type: 'field', label: '保護類型', name: 'field_preset' });
			field_preset.append({
					type: 'select',
					name: 'category',
					label: '類型和理由：',
					event: Twinkle.protect.callback.changePreset,
					list: (mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate)
				});

			field1 = new Morebits.quickForm.element({ type: 'field', label: '選項', name: 'field1' });
			field1.append( {
					type: 'select',
					name: 'expiry',
					label: '時長：',
					list: [
						{ label: '臨時', value: 'temporary' },
						{ label: '永久', value: 'indefinite' },
						{ label: '', selected: true, value: '' }
					]
				} );
			field1.append({
					type: 'textarea',
					name: 'reason',
					label: '理由：'
				});
			break;
		default:
			alert("這玩意兒壞掉了！");
			break;
	}

	var oldfield;
	if (field_preset) {
		oldfield = $(e.target.form).find('fieldset[name="field_preset"]')[0];
		oldfield.parentNode.replaceChild(field_preset.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field_preset"]').css('display', 'none');
	}
	if (field1) {
		oldfield = $(e.target.form).find('fieldset[name="field1"]')[0];
		oldfield.parentNode.replaceChild(field1.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field1"]').css('display', 'none');
	}
	if (field2) {
		oldfield = $(e.target.form).find('fieldset[name="field2"]')[0];
		oldfield.parentNode.replaceChild(field2.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field2"]').css('display', 'none');
	}

	if (e.target.values === 'protect') {
		// fake a change event on the preset dropdown
		var evt = document.createEvent( "Event" );
		evt.initEvent( 'change', true, true );
		e.target.form.category.dispatchEvent( evt );

		// re-add protection level text, if it's available
		if (Twinkle.protect.protectionLevel) {
			Morebits.status.init($('div[name="currentprot"] span').last()[0]);
			Morebits.status.info("當前保護等級", Twinkle.protect.protectionLevel);
		}

		// reduce vertical height of dialog
		$(e.target.form).find('fieldset[name="field2"] select').parent().css({ display: 'inline-block', marginRight: '0.5em' });
	}
};

Twinkle.protect.formevents = {
	editmodify: function twinkleprotectFormEditmodifyEvent(e) {
		e.target.form.editlevel.disabled = !e.target.checked;
		e.target.form.editexpiry.disabled = !e.target.checked || (e.target.form.editlevel.value === 'all');
		e.target.form.editlevel.style.color = e.target.form.editexpiry.style.color = (e.target.checked ? "" : "transparent");
	},
	editlevel: function twinkleprotectFormEditlevelEvent(e) {
		e.target.form.editexpiry.disabled = (e.target.value === 'all');
	},
	movemodify: function twinkleprotectFormMovemodifyEvent(e) {
		e.target.form.movelevel.disabled = !e.target.checked;
		e.target.form.moveexpiry.disabled = !e.target.checked || (e.target.form.movelevel.value === 'all');
		e.target.form.movelevel.style.color = e.target.form.moveexpiry.style.color = (e.target.checked ? "" : "transparent");
	},
	movelevel: function twinkleprotectFormMovelevelEvent(e) {
		e.target.form.moveexpiry.disabled = (e.target.value === 'all');
	},
	createlevel: function twinkleprotectFormCreatelevelEvent(e) {
		e.target.form.createexpiry.disabled = (e.target.value === 'all');
	},
	tagtype: function twinkleprotectFormTagtypeEvent(e) {
		e.target.form.small.disabled = e.target.form.noinclude.disabled = (e.target.value === 'none') || (e.target.value === 'noop');
	}
};

Twinkle.protect.doCustomExpiry = function twinkleprotectDoCustomExpiry(target) {
	var custom = prompt('輸入自定義終止時間。\n您可以使用相對時間，如「1 minute」或「19 days」，或絕對時間「yyyymmddhhmm」（如「200602011405」是2006年02月01日14：05（UTC））', '');
	if (custom) {
		var option = document.createElement('option');
		option.setAttribute('value', custom);
		option.textContent = custom;
		target.appendChild(option);
		target.value = custom;
	} else {
		target.selectedIndex = 0;
	}
};

Twinkle.protect.protectionTypes = [
	{ label: '解除保護', value: 'unprotect' },
	{
		label: '全保護',
		list: [
			{ label: '常規（全）', value: 'pp-protected' },
			{ label: '爭議、編輯戰（全）', value: 'pp-dispute' },
			{ label: '長期破壞（全）', value: 'pp-vandalism' },
			{ label: '高風險模板（全）', value: 'pp-template' },
			{ label: '已封禁用戶的討論頁（全）', value: 'pp-usertalk' }
		]
	},
	{
		label: '半保護',
		list: [
			{ label: '常規（半）', value: 'pp-semi-protected' },
			{ label: '長期破壞（半）', value: 'pp-semi-vandalism' },
			{ label: '違反生者傳記方針（半）', value: 'pp-semi-blp' },
			{ label: '傀儡破壞（半）', value: 'pp-semi-sock' },
			{ label: '高風險模板（半）', value: 'pp-semi-template' },
			{ label: '已封禁用戶的討論頁（半）', value: 'pp-semi-usertalk' }
		]
	},
	{
		label: '移動保護',
		list: [
			{ label: '常規（移動）', value: 'pp-move' },
			{ label: '爭議、移動戰（移動）', value: 'pp-move-dispute' },
			{ label: '移動破壞（移動）', value: 'pp-move-vandalism' },
			{ label: '高風險頁面（移動）', value: 'pp-move-indef' }
		]
	}
];

Twinkle.protect.protectionTypesAdmin = Twinkle.protect.protectionTypes;

Twinkle.protect.protectionTypesCreate = [
	{ label: '解除保護', value: 'unprotect' },
	{
		label: '白紙保護',
		list: [
			{ label: '常規', value: 'pp-create' }
		]
	}
];

// NOTICE: keep this synched with [[MediaWiki:Protect-dropdown]]
Twinkle.protect.protectionPresetsInfo = {
	'pp-protected': {
		edit: 'sysop',
		move: 'sysop',
		reason: null
	},
	'pp-dispute': {
		edit: 'sysop',
		move: 'sysop',
		reason: '編輯戰'
	},
	'pp-vandalism': {
		edit: 'sysop',
		move: 'sysop',
		reason: '被自動確認用戶破壞'
	},
	'pp-template': {
		edit: 'sysop',
		move: 'sysop',
		reason: '高風險模板'
	},
	'pp-usertalk': {
		edit: 'sysop',
		move: 'sysop',
		reason: '已封禁用戶濫用其對話頁'
	},
	'pp-semi-vandalism': {
		edit: 'autoconfirmed',
		reason: '被IP用戶或新用戶破壞',
		template: 'pp-vandalism'
	},
	'pp-semi-blp': {
		edit: 'autoconfirmed',
		reason: 'IP用戶或新用戶違反生者傳記方針'
	},
	'pp-semi-usertalk': {
		edit: 'autoconfirmed',
		move: 'sysop',
		reason: '已封禁用戶濫用其對話頁'
	},
	'pp-semi-template': {  // removed for now
		edit: 'autoconfirmed',
		move: 'sysop',
		reason: '高風險模板',
		template: 'pp-template'
	},
	'pp-semi-sock': {
		edit: 'autoconfirmed',
		reason: '持續的傀儡破壞'
	},
	'pp-semi-protected': {
		edit: 'autoconfirmed',
		reason: null,
		template: 'pp-protected'
	},
	'pp-move': {
		move: 'sysop',
		reason: null
	},
	'pp-move-dispute': {
		move: 'sysop',
		reason: '頁面移動戰'
	},
	'pp-move-vandalism': {
		move: 'sysop',
		reason: '移動破壞'
	},
	'pp-move-indef': {
		move: 'sysop',
		reason: '高風險頁面'
	},
	'unprotect': {
		edit: 'all',
		move: 'all',
		create: 'all',
		reason: null,
		template: 'none'
	},
	'pp-create': {
		create: 'autoconfirmed',
		reason: '{{pp-create}}'
	}
};

Twinkle.protect.protectionTags = [
	{
		label: '無（移除現有模板）',
		value: 'none'
	},
	{
		label: '無（不移除現有模板）',
		value: 'noop'
	},
	{
		label: '全保護模板',
		list: [
			{ label: '{{pp-dispute}}: 爭議', value: 'pp-dispute', selected: true },
			{ label: '{{pp-usertalk}}: 封禁的用戶', value: 'pp-usertalk' }
		]
	},
	{
		label: '全、半保護模板',
		list: [
			{ label: '{{pp-vandalism}}: 破壞', value: 'pp-vandalism' },
			{ label: '{{pp-template}}: 高風險模板', value: 'pp-template' },
			{ label: '{{pp-protected}}: 常規', value: 'pp-protected' }
		]
	},
	{
		label: '半保護模板',
		list: [
			{ label: '{{pp-semi-usertalk}}: 封禁的用戶', value: 'pp-semi-usertalk' },
			{ label: '{{pp-semi-sock}}: 傀儡', value: 'pp-semi-sock' },
			{ label: '{{pp-semi-blp}}: 生者傳記', value: 'pp-semi-blp' },
			{ label: '{{pp-semi-indef}}: 長期', value: 'pp-semi-indef' }
		]
	},
	{
		label: '移動保護模板',
		list: [
			{ label: '{{pp-move-dispute}}: 爭議', value: 'pp-move-dispute' },
			{ label: '{{pp-move-vandalism}}: 破壞', value: 'pp-move-vandalism' },
			{ label: '{{pp-move-indef}}: 長期', value: 'pp-move-indef' },
			{ label: '{{pp-move}}: 常規', value: 'pp-move' }
		]
	}
];

Twinkle.protect.callback.changePreset = function twinkleprotectCallbackChangePreset(e) {
	var form = e.target.form;

	var actiontypes = form.actiontype;
	var actiontype;
	for( var i = 0; i < actiontypes.length; i++ )
	{
		if( !actiontypes[i].checked ) {
			continue;
		}
		actiontype = actiontypes[i].values;
		break;
	}

	if (actiontype === 'protect') {  // actually protecting the page
		var item = Twinkle.protect.protectionPresetsInfo[form.category.value];
		if (mw.config.get('wgArticleId')) {
			if (item.edit) {
				form.editmodify.checked = true;
				Twinkle.protect.formevents.editmodify({ target: form.editmodify });
				form.editlevel.value = item.edit;
				Twinkle.protect.formevents.editlevel({ target: form.editlevel });
			} else {
				form.editmodify.checked = false;
				Twinkle.protect.formevents.editmodify({ target: form.editmodify });
			}

			if (item.move) {
				form.movemodify.checked = true;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
				form.movelevel.value = item.move;
				Twinkle.protect.formevents.movelevel({ target: form.movelevel });
			} else {
				form.movemodify.checked = false;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
			}
		} else {
			if (item.create) {
				form.createlevel.value = item.create;
				Twinkle.protect.formevents.createlevel({ target: form.createlevel });
			}
		}

		var reasonField = (actiontype === "protect" ? form.protectReason : form.reason);
		if (item.reason) {
			reasonField.value = item.reason;
		} else {
			reasonField.value = '';
		}

		// sort out tagging options
		if (mw.config.get('wgArticleId')) {
			if( form.category.value === 'unprotect' ) {
				form.tagtype.value = 'none';
			} else {
				form.tagtype.value = (item.template ? item.template : form.category.value);
			}
			Twinkle.protect.formevents.tagtype({ target: form.tagtype });

			if( /template/.test( form.category.value ) ) {
				form.noinclude.checked = true;
				form.editexpiry.value = form.moveexpiry.value = "indefinite";
			} else {
				form.noinclude.checked = false;
			}
		}

	} else {  // RPP request
		if( form.category.value === 'unprotect' ) {
			form.expiry.value = '';
			form.expiry.disabled = true;
		} else {
			form.expiry.disabled = false;
		}
	}
};

Twinkle.protect.callback.evaluate = function twinkleprotectCallbackEvaluate(e) {
	var form = e.target;

	var actiontypes = form.actiontype;
	var actiontype;
	for( var i = 0; i < actiontypes.length; i++ )
	{
		if( !actiontypes[i].checked ) {
			continue;
		}
		actiontype = actiontypes[i].values;
		break;
	}

	var tagparams;
	if( !mw.config.get('wgArticleId') ) {
		tagparams = {
			tag: 'noop'
		};
	} else if( actiontype === 'tag' || (actiontype === 'protect' && mw.config.get('wgArticleId')) ) {
		tagparams = {
			tag: form.tagtype.value,
			reason: ((form.tagtype.value === 'pp-protected' || form.tagtype.value === 'pp-semi-protected' || form.tagtype.value === 'pp-move') && form.protectReason) ? form.protectReason.value : null,
			expiry: (actiontype === 'protect') ? (form.editmodify.checked ? form.editexpiry.value : (form.movemodify.checked ?
				form.moveexpiry.value : null)) : null,
			small: form.small.checked,
			noinclude: form.noinclude.checked
		};
	}

	switch (actiontype) {
		case 'protect':
			// protect the page

			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.notice = "保護完成";

			var statusInited = false;
			var thispage;

			var allDone = function twinkleprotectCallbackAllDone() {
				if (thispage) {
					thispage.getStatusElement().info("完成");
				}
				if (tagparams) {
					Twinkle.protect.callbacks.taggingPageInitial(tagparams);
				}
			};

			var protectIt = function twinkleprotectCallbackProtectIt(next) {
				thispage = new Morebits.wiki.page(mw.config.get('wgPageName'), "保護頁面");
				if (mw.config.get('wgArticleId')) {
					if (form.editmodify.checked) {
						thispage.setEditProtection(form.editlevel.value, form.editexpiry.value);
					}
					if (form.movemodify.checked) {
						thispage.setMoveProtection(form.movelevel.value, form.moveexpiry.value);
					}
				} else {
					thispage.setCreateProtection(form.createlevel.value, form.createexpiry.value);
					thispage.setWatchlist(false);
				}

				if (form.protectReason.value) {
					thispage.setEditSummary(form.protectReason.value);
				} else {
					alert("您必須輸入保護理由，這將被記錄在保護日誌中。");
					return;
				}

				if (!statusInited) {
					Morebits.simpleWindow.setButtonsEnabled( false );
					Morebits.status.init( form );
					statusInited = true;
				}

				thispage.protect(next);
			};
			
			if ((form.editmodify && form.editmodify.checked) || (form.movemodify && form.movemodify.checked) || 
				!mw.config.get('wgArticleId')) {
				protectIt(allDone);
			} else {
				alert("請告訴Twinkle要做什麼！\n如果您只是想標記該頁，請選擇上面的「用保護模板標記此頁」選項。");
			}

			break;

		case 'tag':
			// apply a protection template

			Morebits.simpleWindow.setButtonsEnabled( false );
			Morebits.status.init( form );

			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.followRedirect = false;
			Morebits.wiki.actionCompleted.notice = "標記完成";

			Twinkle.protect.callbacks.taggingPageInitial(tagparams);
			break;

		case 'request':
			// file request at RPP
			var typename, typereason;
			switch( form.category.value ) {
				case 'pp-dispute':
				case 'pp-vandalism':
				case 'pp-template':
				case 'pp-usertalk':
				case 'pp-protected':
					typename = '全保護';
					break;
				case 'pp-semi-vandalism':
				case 'pp-semi-usertalk':
				case 'pp-semi-template':  // removed for now
				case 'pp-semi-sock':
				case 'pp-semi-blp':
				case 'pp-semi-protected':
					typename = '半保護';
					break;
				case 'pp-move':
				case 'pp-move-dispute':
				case 'pp-move-indef':
				case 'pp-move-vandalism':
					typename = '移動保護';
					break;
				case 'pp-create':
				case 'pp-create-offensive':
				case 'pp-create-blp':
				case 'pp-create-salt':
					typename = '白紙保護';
					break;
				case 'unprotect':
					/* falls through */
				default:
					typename = '解除保護';
					break;
			}
			switch (form.category.value) {
				case 'pp-dispute':
					typereason = '爭議、編輯戰';
					break;
				case 'pp-vandalism':
				case 'pp-semi-vandalism':
					typereason = '長期破壞';
					break;
				case 'pp-template':
				case 'pp-semi-template':  // removed for now
					typereason = '高風險模板';
					break;
				case 'pp-usertalk':
				case 'pp-semi-usertalk':
					typereason = '已封禁用戶的討論頁';
					break;
				case 'pp-semi-sock':
					typereason = '傀儡破壞';
					break;
				case 'pp-semi-blp':
					typereason = '違反生者傳記方針';
					break;
				case 'pp-move-dispute':
					typereason = '爭議、移動戰';
					break;
				case 'pp-move-vandalism':
					typereason = '移動破壞';
					break;
				case 'pp-move-indef':
					typereason = '高風險頁面';
					break;
				default:
					typereason = '';
					break;
			}

			var reason = typereason;
			if( form.reason.value !== '') {
				if ( typereason !== '' ) {
					reason += "：";
				}
				reason += form.reason.value;
			}
			if( reason !== '' && reason.charAt( reason.length - 1 ) !== '。' ) {
				reason += '。';
			}

			var rppparams = {
				reason: reason,
				typename: typename,
				category: form.category.value,
				expiry: form.expiry.value
			};

			Morebits.simpleWindow.setButtonsEnabled( false );
			Morebits.status.init( form );

			var rppName = 'Wikipedia:請求保護頁面';

			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = rppName;
			Morebits.wiki.actionCompleted.notice = "提名完成，重定向到討論頁";

			var rppPage = new Morebits.wiki.page( rppName, '請求保護頁面');
			rppPage.setFollowRedirect( true );
			rppPage.setCallbackParameters( rppparams );
			rppPage.load( Twinkle.protect.callbacks.fileRequest );
			break;
		default:
			alert("twinkleprotect: 未知操作類型");
			break;
	}
};

Twinkle.protect.callbacks = {
	taggingPageInitial: function( tagparams ) {
		if (tagparams.tag === 'noop') {
			Morebits.status.info("應用保護模板", "沒什麼要做的");
			return;
		}

		var protectedPage = new Morebits.wiki.page( mw.config.get('wgPageName'), '標記頁面');
		protectedPage.setCallbackParameters( tagparams );
		protectedPage.load( Twinkle.protect.callbacks.taggingPage );
	},
	taggingPage: function( protectedPage ) {
		var params = protectedPage.getCallbackParameters();
		var text = protectedPage.getPageText();
		var tag, summary;

		var oldtag_re = /\s*(?:<noinclude>)?\s*\{\{\s*(pp-[^{}]*?|protected|(?:t|v|s|p-|usertalk-v|usertalk-s|sb|move)protected(?:2)?|protected template|privacy protection)\s*?\}\}\s*(?:<\/noinclude>)?\s*/gi;
		var re_result = oldtag_re.exec(text);
		if (re_result) {
			if (confirm("在頁面上找到{{" + re_result[1] + "}}\n點擊確定以移除，或點擊取消以取消。")) {
				text = text.replace( oldtag_re, '' );
			}
		}

		if ( params.tag !== 'none' ) {
			tag = params.tag;
			if( params.reason ) {
				tag += '|reason=' + params.reason;
			}
			if( ['indefinite', 'infinite', 'never', null].indexOf(params.expiry) === -1 ) {
				tag += '|expiry={{subst:#time:c|' + (/^\s*\d+\s*$/.exec(params.expiry) ? params.expiry : '+' + params.expiry) + '}}';
			}
			if( params.small ) {
				tag += '|small=yes';
			}
		}

		if( params.tag === 'none' ) {
			summary = '移除保護模板' + Twinkle.getPref('summaryAd');
		} else {
			if( params.noinclude ) {
				text = "<noinclude>{{" + tag + "}}</noinclude>" + text;
			} else if( Morebits.wiki.isPageRedirect() ) {
				text = text + "\n{{" + tag + "}}";
			} else {
				text = "{{" + tag + "}}\n" + text;
			}
			summary = "添加{{" + params.tag + "}}" + Twinkle.getPref('summaryAd');
		}

		protectedPage.setEditSummary( summary );
		protectedPage.setPageText( text );
		protectedPage.setCreateOption( 'nocreate' );
		protectedPage.suppressProtectWarning(); // no need to let admins know they are editing through protection
		protectedPage.save();
	},

	fileRequest: function( rppPage ) {

		var params = rppPage.getCallbackParameters();
		var text = rppPage.getPageText();
		var statusElement = rppPage.getStatusElement();

		var rppRe = new RegExp( '===\\s*[[:?' + RegExp.escape( mw.config.get('wgPageName'), true ) + ']]\\s*===', 'm' );
		var tag = rppRe.exec( text );

		var rppLink = document.createElement('a');
		rppLink.setAttribute('href', mw.util.getUrl(rppPage.getPageName()) );
		rppLink.appendChild(document.createTextNode(rppPage.getPageName()));

		if ( tag ) {
			statusElement.error( [ '已有對此條目的保護提名，在 ', rppLink, '，取消操作。' ] );
			return;
		}

		var newtag = '=== [[:' + mw.config.get('wgPageName') +  ']] ===' + "\n";
		if( ( new RegExp( '^' + RegExp.escape( newtag ).replace( /\s+/g, '\\s*' ), 'm' ) ).test( text ) ) {
			statusElement.error( [ '已有對此條目的保護提名，在 ', rppLink, '，取消操作。' ] );
			return;
		}

		var words;
		switch( params.expiry ) {
		case 'temporary':
			words = "臨時";
			break;
		case 'indefinite':
			words = "永久";
			break;
		default:
			words = "";
			break;
		}

		words += params.typename;

		newtag += "請求" + Morebits.string.toUpperCaseFirstChar(words) + ( params.reason !== '' ? "：" +
			Morebits.string.formatReasonText(params.reason) : "。" ) + "--~~~~";

		var reg;

		if ( params.category === 'unprotect' ) {
			reg = /(==\s*請求解除保護\s*==\n)/;
		} else {
			reg = /(\/header2}}\n)/;
		}
		var originalTextLength = text.length;
		text = text.replace( reg, "$1" + newtag + "\n");
		if (text.length === originalTextLength)
		{
			var linknode = document.createElement('a');
			linknode.setAttribute("href", mw.util.getUrl("Wikipedia:Twinkle/修復RFPP") );
			linknode.appendChild(document.createTextNode('如何修復RFPP'));
			statusElement.error( [ '無法在WP:RFPP上找到相關位點標記，要修復此問題，請參見', linknode, '。' ] );
			return;
		}
		statusElement.status( '添加新提名…' );
		rppPage.setEditSummary( '請求對[[' + Morebits.pageNameNorm + ']]' + params.typename + Twinkle.getPref('summaryAd') );
		rppPage.setPageText( text );
		rppPage.setCreateOption( 'recreate' );
		rppPage.save();
	}
};
})(jQuery);


//</nowiki>
