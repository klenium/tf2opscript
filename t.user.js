// ==UserScript==
// @name Backpack.tf prices on Tf2outpost
// @author kléni
// @include http://*.tf2outpost.com/*
// @include http://*.dotaoutpost.com/*
// @require http://code.jquery.com/jquery-2.1.0.min.js
// @updateURL https://raw.githubusercontent.com/klenium/tf2opscript/master/t.user.js
// @grant GM_xmlhttpRequest
// @version 1.4.3
// ==/UserScript==

var checkReady = function(check, callback)
{
	var c = check();
	if (c)
		callback();
	else
		window.setTimeout(function() { checkReady(check, callback); }, 100);
};
var zemnmodal =
{
	//this script loads earlier than outpost scripts, had to add it
	a: $('<div class="zemnmodal" />'),
	c: $('<div class="zemncontent" />'),
	make: function(b)
	{
		if (!$("body > .zemnmodal").length)
		{
			this.a.append(this.c);
			$("body").append(this.a);
			this.a.click(function(e)
			{
				if (e.target == this)
					zemnmodal.unmake();
			});
		}
		this.c.html(b).css("margin-top", 120 + $(window).scrollTop());
		this.a.height($(document).height()).stop(true).fadeIn(200);
	},
	unmake: function()
	{
		this.a.stop(true).fadeOut(200);
	}
};
var update = function()
{
	if (localStorage.apikey === undefined)
	{
		zemnmodal.make('Get an API key from backpack.tf! <a id="keylink" href="http://backpack.tf/api/register/" target="_blank">Click here</a>, and copy the key!<br />You can type anything in the URL and reason fields, eg. "http://tf2outpost.com", and "price script".');
		$("#keylink").click(function()
		{
			$(this).parent().html('Paste the key here:<br /><input id="keyinput" type="text" style="width: 170px; padding: 13px; border: 0px; background-color: #1C1A17;" />');
			$("#keyinput").focus().keyup(function()
			{
				if (this.value.length == 24)
				{
					localStorage.apikey = this.value;
					zemnmodal.unmake();
					process();
				}
			});
		});
	}
	else
		process();
};
var setcookie = function(name, value, time)
{
	var expires = "";
	if (time)
	{
		var date = new Date();
		date.setTime(date.getTime()+time);
		var expires = "; expires="+date.toGMTString();
	}
	document.cookie = name+"="+value+expires+"; path=/";
}
var getcookie = function(name)
{
	var ca = document.cookie.split(";");
	for (var i = 0; i < ca.length; i++)
	{
		var c = ca[i].trim();
		if (c.indexOf(name+"=") == 0)
			return c.substring(name.length+1, c.length);
	}
	return null;
}
var process = function()
{
	if (getcookie("error"))
		return;
	GM_xmlhttpRequest({
		method: "GET",
		url: "http://backpack.tf/api/IGetPrices/v4/?format=json&key="+localStorage.apikey,
		onload: function(e)
		{
			try
			{
				var data = JSON.parse(e.responseText);
				if (data.response.message)
					throw data.response.message;
				if (!data)
					return;
				var n = {},
					ref = data.response.items["Refined Metal"]["prices"][6]["Tradable"]["Craftable"][0],
					key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
					bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
					m = ref.value_high ? ((ref.value+ref.value_high)/2) : ref.value,
					k = key.value_high ? ((key.value+key.value_high)/2) : key.value,
					b = bud.value_high ? ((bud.value+bud.value_high)/2) : bud.value,
					utk = m*k,
					utb = m*k*b,
					date = data.response.current_time,
					names = {
						metal: 1,
						keys: 2,
						earbuds: 3,
						usd: 4
					},
					parts = {};
				$.each(data.response.items, function(name)
				{
					var item = this;
					if (!item.defindex || !item.prices)
						return;
					$.each(item.defindex, function()
					{
						var x = this;
						//crates, we don't need 3 defindexs for them
						if (x == 5041 || x == 5045)
							return;
						if (name.indexOf("Strange Part: ") != -1)
							parts[name.replace("Strange Part: ", "").replace(/[\s-.']/g, "").replace("\u00dc", "U")] = x;
						if (!n[x])
							n[x] = {};
						n[x].name = name;
						$.each(item.prices, function(quality)
						{
							var quality = parseInt(quality);
							if (name.indexOf("Australium") != -1 && name != "Australium Gold")
								quality *= -1;
							if (!n[x][quality])
								n[x][quality] = {};
							$.each(this, function(tradable)
							{
								var tradable = tradable == "Tradable" ? 1 : 0;
								if (!n[x][quality][tradable])
									n[x][quality][tradable] = {};
								$.each(this, function(craftable)
								{
									var craftable = craftable == "Craftable" ? 1 : 0;
									if (!n[x][quality][tradable][craftable])
										n[x][quality][tradable][craftable] = {};
									$.each(this, function(index)
									{
										var index = parseInt(index);
										var type = this.currency,
											l = this.value,
											h = this.value_high;
										//converting USD values to keys/buds, so we won't need it later
										if (quality == 5 && type == "usd")
										{
											if (l < utb)
											{
												l = Math.round(l/utk);
												if (h)
													h = Math.round(h/utk);
												type = "keys";
											}
											else
											{
												l = (l/utb).toFixed(1);
												l = l.substr(-1) == "0" ? l.substr(0, l.length-2) : l;
												if (h)
												{
													h = (h/utb).toFixed(1);
													h = h.substr(-1) == "0" ? h.substr(0, h.length-2) : h;
												}
												type = "earbuds";
											}
										}
										var d = [names[type], date-this.last_update, this.difference, l];
										if (h)
											d.push(h);
										n[x][quality][tradable][craftable][index] = d;
									});
								});
							});
						});
					});
				});
				var isdata = localStorage.data === undefined;
				localStorage.data = JSON.stringify(n);
				localStorage.parts = JSON.stringify(parts);
				localStorage.lastupdate = date;
				if (isdata)
					location.reload();
			}
			catch(error)
			{
				var html = "Couldn't update the prices, because:<br />"+error;
				zemnmodal.make(html);
				if (error == "API key does not exist.")
				{
					//getting a new key
					localStorage.removeItem("apikey");
					setTimeout(function()
					{
						zemnmodal.unmake();
						update();
					}, 2000);
				}
				else
				{
					var c = parseInt(getcookie("error"));
					var time = 30000;
					if (c)
					{
						if (btoa(error) == getcookie("errorvalue"))
							c++;
						else
							c = 1;
						if (c >= 3)
							time = 36000000;
					}
					setcookie("error", c, time);
					setcookie("errorvalue", btoa(error), 36000000);
				}
			}
		}
	});
};
var num = function(num1, operator, num2)
{
	num1 = parseFloat(num1);
	num2 = parseFloat(num2);
	var strNum1 = num1 + "",
		strNum2 = num2 + "",
		dpNum1 = !!(num1 % 1) ? (strNum1.length - strNum1.indexOf(".") - 1) : 0,
		dpNum2 = !!(num2 % 1) ? (strNum2.length - strNum2.indexOf(".") - 1) : 0,
		multiplier = Math.pow(10, dpNum1 > dpNum2 ? dpNum1 : dpNum2),
		tempNum1 = Math.round(num1 * multiplier),
		tempNum2 = Math.round(num2 * multiplier);
	switch (operator)
	{
		case "+": return (tempNum1 + tempNum2) / multiplier;
		case "-": return (tempNum1 - tempNum2) / multiplier;
		case "*": return (tempNum1 * tempNum2) / (multiplier * multiplier);
		case "/": return (tempNum1 / tempNum2);
	}
}
var getprice = function(defindex, quality, trade, craft, index, output, round, fix)
{
	var obj = p[defindex][quality][trade][craft][index],
		low = parseFloat(obj[3]),
		high = parseFloat(obj[4] ? obj[4] : obj[3]),
		k = obj[0],
		type = ["ref", "key", "bud", "USD"][k-1];
	if (round)
	{
		low = (low+high)/2;
		if (!fix)
			low = low.toFixed(2);
		low = parseFloat(low);
		high = low;
	}
	if (output)
	{
		var r = getprice(5002, 6, 1, 1, 0, false, true, true),
			k = getprice(5021, 6, 1, 1, 0, false, true),
			b = getprice(143, 6, 1, 1, 0, false, true);
		switch (type)
		{
			case "ref" : return num(low, "*", r[0]);
			case "key" : return num(low, "*", num(r[0], "*", k[0]));
			case "bud" : return num(low, "*", num(r[0], "*", num(k[0], "*", b[0])));
			default: return low;
		}
	}
	return [low, high, type, obj[1], obj[2]];
};
var round = function(value, date, diff, name, input, output)
{
	var r = getprice(5002, 6, 1, 1, 0, false, true, true)[0],
		k = getprice(5021, 6, 1, 1, 0, false, true)[0],
		b = getprice(143, 6, 1, 1, 0, false, true)[0],
		type = "";
	if (output)
		return [value, value, "USD", date];
	else if (value < r*k || (value == r*k && input == 1))
	{
		value /= r;
		type = "ref";
	}
	else if (value < r*k*b || (value == r*k*b && input == 2))
	{
		value /= r*k;
		type = "key";
	}
	else
	{
		value /= r*k*b;
		type = "bud";
	}
	return [parseFloat(value.toFixed(2)), parseFloat(value.toFixed(2)), type, date, diff, name];
};
var pricetext = function(obj, unusual)
{
	var low = obj[0],
		high = obj[1],
		type = obj[2],
		now = Math.round((new Date()).getTime()/1000),
		last = parseInt(localStorage.lastupdate),
		date = obj[3]+now-last,
		o = "";
	if ((type == "bud" || type == "key") && ((high == low && low != 1) || (high != low && (low != 1 || high != 1))))
		type += "s";
	if (date > (60*60*24*30.5*3) && unusual && localStorage.warn === undefined)
		o = " <span class='label'>(updated "+(date/60/60/24/30.5).toFixed(1)+" months ago)</span>";
	return low+(high != low ? " - "+high : "")+" "+type+o;
};
var item = function(i, replace)
{
	if (i.data("attrs"))
		return JSON.parse(i.data("attrs"));
	if (!i.attr("data-hash"))
		return;
	var id = i.attr("data-hash").split(",");
	if (id[0] != 440)
		return;
	if (label)
		i.find(".equipped, .series_no, .quantity, .medal_no, .craft_no").hide();
	var na = [],
		a = (i.attr("data-attributes") || "").split("<br>"),
		is_unusual = i.hasClass("it_440_5"),
		total = 0;
	//HHHH and Haunted Metal Scrap aren't unusual hats
	if (id[1] == 266 && id[1] == 267)
		is_unusual = false;
	var paints = {
		IndubitablyGreen: 5027,
		ZepheniahsGreed: 5028,
		NobleHattersViolet: 5029,
		ColorNo216190216: 5030,
		ADeepCommitmenttoPurple: 5031,
		MannCoOrange: 5032,
		Muskelmannbraun: 5033,
		PeculiarlyDrabTincture: 5034,
		RadiganConagherBrown: 5035,
		YeOldeRusticColour: 5036,
		AustraliumGold: 5037,
		AgedMoustacheGrey: 5038,
		AnExtraordinaryAbundanceofTinge: 5039,
		ADistinctiveLackofHue: 5040,
		TeamSpirit: 5046,
		PinkasHell: 5051,
		AColorSimilartoSlate: 5052,
		DrablyOlive: 5053,
		TheBitterTasteofDefeatandLime: 5054,
		TheColorofaGentlemannsBusinessPants: 5055,
		DarkSalmonInjustice: 5056,
		AMannsMint: 5076,
		AfterEight: 5077,
		OperatorsOveralls: 5060,
		WaterloggedLabCoat: 5061,
		BalaclavasAreForever: 5062,
		AnAirofDebonair: 5063,
		TheValueofTeamwork: 5064,
		CreamSpirit: 5065
	},
	spells = {
		BruisedPurpleFootprints: 8919,
		ChromaticCorruption: 8902,
		CorpseGrayFootprints: 8916,
		DemomansCadaverousCroak: 8910,
		DieJob: 8901,
		EngineerssGravellyGrowl: 8908,
		Exorcism: 8921,
		GangreenFootprints: 8915,
		GourdGrenades: 8923,
		HeadlessHorseshoes: 8920,
		HeavysBottomlessBass: 8909,
		MedicsBloodcurdlingBellow: 8913,
		PutrescentPigmentation: 8900,
		PyrosMuffledMoan: 8911,
		RottenOrangeFootprints: 8918,
		ScoutsSpectralSnarl: 8906,
		SentryQuadPumpkins: 8924,
		SinisterStaining: 8904,
		SnipersDeepDownunderDrawl: 8907,
		SoldiersBoomingBark: 8905,
		SpectralFlame: 8925,
		SpectralSpectrum: 8903,
		SpysCreepyCroon: 8912,
		SquashRockets: 8922,
		TeamSpiritFootprints: 8914,
		ViolentVioletFootprints: 8917
	},
	//some cases outpost uses custom names
	parts = $.extend(JSON.parse(localStorage.parts), {
		AirborneEnemyKills: 6012,
		KillsUnderAFullMoon: 6015,
		Dominations: 6016,
		Revenges: 6018,
		SappersRemoved: 6025,
		KillsWhileLowHealth: 6032,
		DefendersKilled: 6035,
		KillsWhileInvulnUberCharged: 6037,
		KillsWhileUbercharged: 6037,
		TauntKills: 6051,
		SubmergedEnemyKills: 6036,
		BurningPlayerKills: 6053,
		KillsDuringHalloween: 6033,
		KillsduringVictoryTime: 6041
	});
	for (var x = 0; x < a.length; x++)
	{
		var attr = $("<span>"+a[x]+"</span>").text();
		attr = [attr.substr(0, attr.indexOf(":")), attr.substr(attr.indexOf(":")+2, attr.length-1)];
		if (attr[0] && attr[1])
		{
			if (attr[0] == "Painted")
			{
				//painted paint? grr
				if (i.attr("data-name") == attr[1])
					i.find(".paint, .paint_secondary").remove();
				else
				{
					i.get(0).paint = attr[1]; //i.data() doesn't work, nice work Sneeza :P
					var n = attr[1].replace(/[\s-.']/g, "");
					if (paints[n] && p[paints[n]])
					{
						if (!is_unusual)
							total += getprice(paints[n], 6, 1, 1, 0, true, true)*ppaint;
						na.push("<span class='label'>Painted:</span> "+attr[1]+(tooltip ? " <span class='label'>("+pricetext(getprice(paints[n], 6, 1, 1, 0))+")</span>" : ''));
					}
				}
			}
			else if (attr[0] == "Real Name")
			{
				i.get(0).cn = 1;
				var cn = i.attr("data-name");
				i.data("name", attr[1]).attr("data-name", attr[1]);
				na.push("<span class='label'>Custom Name:</span> "+cn.substr(1, cn.length-2)+(tooltip ? " <span class='label'>("+pricetext(getprice(2093, 6, 1, 1, 0))+")</span>" : ''));
			}
			else if (attr[0] == "Custom Desc")
			{
				i.get(0).cd = 1;
				na.push("<span class='label'>Custom Description:</span> "+attr[1].substr(1, attr[1].length-2)+(tooltip ? " <span class='label'>("+pricetext(getprice(5044, 6, 1, 1, 0))+")</span>" : ''));
			}
			else if (attr[0] == "Halloween Spell")
			{
				i.get(0).spell = attr[1];
				var n = attr[1].replace(/[\s-\.']/g, "");
				if (spells[n] && p[spells[n]])
					na.push("<span class='label'>Halloween Spell:</span> "+attr[1]+(tooltip ? " <span class='label'>("+pricetext(getprice(spells[n], 6, 1, 1, 0))+")</span>" : ''));
			}
			//for unusual taunt, bp.tf uses 30xx IDs which I don't think op will support, and also they don't have background images yet
			else if (attr[0] == "Effect")
			{
				if (is_unusual)
					i.get(0).effect = attr[1];
				var effect;
				if (i.attr("data-name").indexOf("Taunt:") != -1)
				{
					switch (attr[1])
					{
						case "Showstopper": effect = 3001; break;
						case "Showstopper": effect = 3002; break;
						case "Holy Grail": effect = 3003; break;
						case "'72": effect = 3004; break;
						case "Fountain of Delight": effect = 3005; break;
						case "Screaming Tiger": effect = 3006; break;
						case "Skill Gotten Gains": effect = 3007; break;
						case "Midnight Whirlwind": effect = 3008; break;
						case "Silver Cyclone": effect = 3009; break;
						case "Mega Strike": effect = 3010; break;
						default: effect = null;
					}
				}
				else
					effect = null;
				na.push(a[x]);
			}
			else if (attr[0] == "Australium")
			{
				i.get(0).aust = 1;
				if (localStorage.aust !== undefined)
					na.push(a[x]);
			}
			else if (attr[0] == "Gifted By")
			{
				i.get(0).gifted = 1;
				na.push(a[x]);
			}
			else if (attr[0] == "Sheen")
			{
				i.get(0).sheen = attr[1];
				na.push(a[x]);
			}
			else if (attr[0] == "Killstreaks")
			{
				i.get(0).kill = 1;
				na.push(a[x]);
			}
			else if (attr[0] == "Killstreaker")
			{
				i.get(0).streaker = attr[1];
				na.push(a[x]);
			}
			else
			{
				var n = attr[0].replace(/[\s-.']/g, "").replace("\u00dc", "U");
				if (parts[n])
				{
					if (i.get(0).parts !== undefined)
						i.get(0).parts.push(attr[0]);
					else
						i.get(0).parts = [attr[0]];
					if (!is_unusual)
						total += getprice(parts[n], 6, 1, 1, 0, true, true)*pparts;
					na.push("<span class='label'>"+attr[0]+":</span> "+attr[1]+(tooltip ? " <span class='label'>("+pricetext(getprice(parts[n], 6, 1, 1, 0))+")</span>" : ''));
				}
				else
					na.push(a[x]);
			}
		}
	}
	if (na.length)
	{
		var itemattr = "<br>"+na.join("<br>");
		i.data("attributes", itemattr).attr("data-attributes", itemattr);
	}
	else if (i.attr("data-attributes"))
		i.removeData("attributes").removeAttr("data-attributes");
	//Self-made keys
	if (id[1] == 5021 && id[2] == 9)
		id[1] = 5081;
	//crates
	if (id[1] == 5041 || id[1] == 5045)
		id[1] = 5022;
	if (!p[id[1]])
		return;
	var craft = i.hasClass("uncraftable") ? 0 : 1,
		trade = i.hasClass("untradable") ? 0 : 1,
		name = i.attr("data-name");
	i.get(0).craft = craft;
	i.get(0).trade = trade;
	if (name.indexOf("Australium") != -1 && name != "Australium Gold")
	{
		id[2] *= -1;
		if (localStorage.aust === undefined)
		{
			var imgs = {
				"Ambassador": "http://backpack.tf/images/440/backpack/weapons/c_models/c_ambassador/parts/c_ambassador_opt_gold.png",
				"Axtinguisher": "http://backpack.tf/images/440/backpack/weapons/c_models/c_axtinguisher/c_axtinguisher_pyro_gold.png",
				"Black Box": "http://backpack.tf/images/440/backpack/weapons/c_models/c_blackbox/c_blackbox_gold.png",
				"Blutsauger": "http://backpack.tf/images/440/backpack/weapons/c_models/c_leechgun/c_leechgun_gold.png",
				"Eyelander": "http://backpack.tf/images/440/backpack/weapons/c_models/c_claymore/c_claymore_gold.png",
				"Flame Thrower": "http://backpack.tf/images/440/backpack/weapons/c_models/c_flamethrower/c_flamethrower_gold.png",
				"Force-A-Nature": "http://backpack.tf/images/440/backpack/weapons/c_models/c_double_barrel_gold.png",
				"Frontier Justice": "http://backpack.tf/images/440/backpack/weapons/c_models/c_frontierjustice/c_frontierjustice_gold.png",
				"Grenade Launcher": "http://backpack.tf/images/440/backpack/weapons/w_models/w_grenadelauncher_gold.png",
				"Knife": "http://backpack.tf/images/440/backpack/weapons/w_models/w_knife_gold.png",
				"Medi Gun": "http://backpack.tf/images/440/backpack/weapons/c_models/c_medigun/c_medigun_gold.png",
				"Minigun": "http://backpack.tf/images/440/backpack/weapons/w_models/w_minigun_gold.png",
				"Rocket Launcher": "http://backpack.tf/images/440/backpack/weapons/w_models/w_rocketlauncher_gold.png",
				"Scattergun": "http://backpack.tf/images/440/backpack/weapons/c_models/c_scattergun_gold.png",
				"SMG": "http://backpack.tf/images/440/backpack/weapons/w_models/w_smg_gold.png",
				"Sniper Rifle": "http://backpack.tf/images/440/backpack/weapons/w_models/w_sniperrifle_gold.png",
				"Stickybomb Launcher": "http://backpack.tf/images/440/backpack/weapons/w_models/w_stickybomb_launcher_gold.png",
				"Tomislav": "http://backpack.tf/images/440/backpack/weapons/c_models/c_tomislav/c_tomislav_gold.png",
				"Wrench": "http://backpack.tf/images/440/backpack/weapons/w_models/w_wrench_gold_large.png"
			};
			name = name.substr(name.indexOf("Australium")+11, name.length-1);
			i.find("img").attr("src", imgs[name]);
		}
	}
	if (!p[id[1]][id[2]])
		return;
	if (!p[id[1]][id[2]][trade])
		return;
	if (!p[id[1]][id[2]][trade][craft])
		return;
	var s = 0;
	if (is_unusual)
	{
		if (effect !== undefined && effect != null)
			s = effect;
		else
		{
			var bg = i.css("background-image");
			if (bg == "none")
				return;
			s = parseInt(bg.split("effects/")[1].split(".png")[0]);
		}
	}
	if (i.find(".series_no").length)
		s = parseInt(i.find(".series_no").html().substr(1));
	//items with Community Sparkle
	if (name == "Self-Made Mann Co. Supply Crate Key" || ((id[1] == 294 || id[1] == 160) && i.css("background-image") != "none"))
		s = 4;
	if (!p[id[1]][id[2]][trade][craft][s])
		return;
	i.get(0).name = p[id[1]].name;
	var itemattr = (i.attr("data-attributes") || "")+(tooltip ? "<br><span class='label'>Suggested value:</span> "+pricetext(getprice(id[1], id[2], trade, craft, s), is_unusual)+"</span>" : '');
	i.data("attributes", itemattr).attr("data-attributes", itemattr);
	if (localStorage.show !== undefined)
	{
		t = total+getprice(id[1], id[2], trade, craft, s, true, true);
		var item = p[id[1]][id[2]][trade][craft][s],
			a = i.find("a.item_summary");
		if (!a.length)
			a = i.find("> a:eq(0)");
		if (a.find("> *").eq(1).length)
			a.find("> *").eq(1).before('<div class="equipped">'+pricetext(round(t, item[1], item[2], name, item[0], name == "Refined Metal"))+'</div>');
		else
			a.append('<div class="equipped">'+pricetext(round(t, item[1], item[2], name, item[0], name == "Refined Metal"))+'</div>');
	}
	if (localStorage.changes !== undefined)
	{
		var obj = getprice(id[1], id[2], trade, craft, s),
			now = Math.round((new Date()).getTime()/1000),
			last = parseInt(localStorage.lastupdate),
			date = obj[3]+now-last;
		if (date < 60*60*24*(parseFloat(localStorage.days) || 3))
		{
			if (obj[4] == 0) //Brad and Fiskie are so lazy :-c
				var cn = "fa-white fa-certificate";
			else if (obj[4] < 0)
				var cn = "fa-red fa-arrow-down";
			else
			{
				var b = getprice(143, 6, 1, 1, 0),
					k = getprice(5021, 6, 1, 1, 0),
					price = 0;
				if (obj[2] == "bud")
					price = ((obj[0]+obj[1])/2)*((b[0]+b[1])/2)*((k[0]+k[1])/2);
				else if (obj[2] == "key")
					price = ((obj[0]+obj[1])/2)*((k[0]+k[1])/2);
				if (price == obj[4])
					var cn = "fa-white fa-certificate";
				else					
					var cn = "fa-green fa-arrow-up";
			}
			i.find("a.item_summary").append('<div class="fa '+cn+'"></div>');
		}
	}
	var d = [p[id[1]][id[2]][trade][craft][s], total];
	i.data("attrs", JSON.stringify(d));
	return d;
}
var p = JSON.parse(localStorage.data || "[]"),
	label = localStorage.label !== undefined,
	tooltip = localStorage.tooltip === undefined,
	ppaint = parseFloat(localStorage.ppaint)/100 || 0.5,
	pparts = parseFloat(localStorage.pparts)/100 || 0.8;
$(function()
{
	//only in the main window, otherwise it would run 4 times (other scripts)
	if (window.top != window.self)
		return;
	if (localStorage.data === undefined)
		return update();
	if (localStorage.lastupdate !== undefined && parseInt(localStorage.lastupdate) < ((new Date()).getTime()/1000)-(60*60*24*(parseFloat(localStorage.update) || 1)))
		update();
	if (/backpack/.test(location.href) && localStorage.links === undefined)
		$(".navigation_bar .left").append('<li><a href="http://www.tf2outpost.com/user/'+($(".user_info strong").html() == "—" ? $(".user_info").html().split("</span> ")[1] : $(".user_info strong").html())+'/resolve/backpack.tf">BP.TF Profile</a></li>');
	checkReady(function()
	{
		//for invertories and new trade page
		return !(($("body#backpack").length || $("body#new").length) && !$("#p1").length);
	},
	function()
	{
		$("#main_nav").append('<li><a href="#" id="script_settings"><span class="icon_settings"></span>Prices</a></li>');
		var style = '<style>';
		style += '.icon_tick.checkbox { color: #504A46; margin-right: 6px; cursor: pointer; }';
		style += '.icon_tick.checkbox.checked { color: #52BB0C; }';
		style += '.zemnmodal .input { margin: 0px 2px; padding: 0px 3px; border: 2px solid #2A2725; background: #1C1A17; }';
		style += '.zemnmodal .button { padding: 5px; min-width: inherit; }';
		style += 'input.d { width: 17px; }';
		style += '.fa-green { color: #44CC44; }';
		style += '.fa-red { color: #CC4444; }';
		style += '.fa-white { color: #BEBEBE; }';
		style += '.fa { position: absolute; top: 4px; left: 4px; font-size: 16px; }';
		style += '</style>';
		$("head").append(style);
		$("head").append('<link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">');
		if (localStorage.links === undefined)
		{
			if (/user/.test(location.href))
				$(".navigation_bar .left").append('<li><a href="http://www.tf2outpost.com/user/'+($(".user_info strong").html() == "—" ? $(".user_info").html().split("</span> ")[1] : $(".user_info strong").html())+'/resolve/backpack.tf">BP.TF Profile</a></li>');
			$(".item_summary").click(function()
			{
				checkReady(function()
				{
					//waiting for the AJAX response
					return $("#item_summary").length && $(".links").length;
				},
				function()
				{
					if (!$(".links .bptf").length)
					{
						var i = $("#item_summary .item");
						if (!i.attr("data-hash"))
							return;
						var id = i.attr("data-hash").split(",");
						if (id[0] != 440)
							return;
						var is_unusual = i.hasClass("it_440_5") && id[1] != 266 && id[1] != 267;
						if (id[1] == 5021 && id[2] == 9)
							id[1] = 5081;
						if (id[1] == 5041 || id[1] == 5045)
							id[1] = 5022;
						if (!p[id[1]])
							return;
						var craft = i.hasClass("uncraftable") ? "Non-Craftable" : "Craftable",
							trade = i.hasClass("untradable") ? "Non-Tradable" : "Tradable",
							name = i.attr("data-name");
						if (name.indexOf("Australium") != -1 && name != "Australium Gold")
							id[2] *= -1;
						var s = 0;
						if (is_unusual)
						{
							var bg = i.css("background-image");
							if (bg == "none")
								return;
							s = parseInt(bg.split("effects/")[1].split(".png")[0]);
						}
						if (i.find(".series_no").length)
							s = parseInt(i.find(".series_no").html().substr(1));
						if (name == "Self-Made Mann Co. Supply Crate Key" || ((id[1] == 294 || id[1] == 160) && i.css("background-image") != "none"))
							s = 4;
						var quality = "";
						switch (id[2])
						{
							case "0": quality = "Normal"; break;
							case "1": quality = "Genuine"; break;
							case "3": quality = "Vintage"; break;
							case "5": quality = "Unusual"; break;
							case "6": quality = "Unique"; break;
							case "9": quality = "Self-Made"; break;
							case "11": case -11: quality = "Strange"; break;
							case "13": quality = "Haunted"; break;
							case "14": quality = "Collector's"; break;
						}
						var link = "http://backpack.tf/stats/"+quality+"/"+(id[2] == -11 ? "Australium " : "")+p[id[1]].name+"/"+craft+"/"+trade+(s == 0 ? "" : "/"+s);
						$(".links").append('<li class="bptf"><a href="'+link+'" target="_blank"><span class="icon_trades"></span> Stats on BP.TF</a></li>');
						link = "http://backpack.tf/item/"+$("#item_summary .grid .row:eq(1) .white").html();
						$(".links").append('<li><a href="'+link+'" target="_blank"><span class="icon_search"></span> History on BP.TF</a></li>');
					}
				});
			});
		}
		$("#script_settings").click(function()
		{
			var html = '';
			html += '<a href="http://forums.backpack.tf/index.php?/topic/10248-script-for-tf2outpostcom/" target="_blank">Suggestions, bug reports</a><br /><br />';
			html += '<button class="button" type="button" id="update">Update prices now</button><br /><br />';
			html += 'Your backpack.tf API key: <input type="text" class="input" value="'+localStorage.apikey+'" /> <a href="http://backpack.tf/api/register/" target="_blank" id="changekey">Change</a><br />';
			html += 'Update prices automatically on every <input type="text" class="input d" data-name="update" value="'+(parseFloat(localStorage.update) || 1)+'" /> days<br />';
			html += '<span data-name="show" class="checkbox icon_tick'+(localStorage.show !== undefined ? ' checked' : '')+'"></span>Show the price of items on their icon, included';
			html += '<input class="input d" type="text" data-name="ppaint" value="'+(parseFloat(localStorage.ppaint) || 50)+'" />% of paint, and ';
			html += '<input class="input d" type="text" data-name="pparts" value="'+(parseFloat(localStorage.pparts) || 80)+'" />% of strange parts<br />';
			html += '<span data-name="tooltip" class="n checkbox icon_tick'+(localStorage.tooltip === undefined ? ' checked' : '')+'"></span>Show prices on the tooltip of items<br />';
			html += '<span data-name="changes" class="checkbox icon_tick'+(localStorage.changes !== undefined ? ' checked' : '')+'"></span>Show changes in the last <input data-name="days" type="text" class="input d" value="'+(parseFloat(localStorage.days) || 3)+'" /> days<br />';
			html += '<span data-name="warn" class="n checkbox icon_tick'+(localStorage.warn === undefined ? ' checked' : '')+'"></span>Show a warning if an unusual hat was updated more than 3 months<br />';
			html += '<span data-name="aust" class="n checkbox icon_tick'+(localStorage.aust === undefined ? ' checked' : '')+'"></span>Replace images of australium weapons to the images that backpack.tf uses<br />';
			html += '<span data-name="label" class="checkbox icon_tick'+(localStorage.label !== undefined ? ' checked' : '')+'"></span>Remove crate #, craft #, medal #, quantity, and equipped labels from the box of items<br />';
			html += '<span data-name="links" class="n checkbox icon_tick'+(localStorage.links === undefined ? ' checked' : '')+'"></span><span class="c">Add links to the user\'s backpack.tf profile and the stats page of items<br />';
			html += '<span data-name="text" class="n checkbox icon_tick'+(localStorage.text === undefined ? ' checked' : '')+'"></span>On the new trade page, when you select an item, add it\'s <span>';
			html += '<span class="tp checkbox icon_tick'+((localStorage.tp !== undefined && localStorage.tp == 1) ? ' checked' : '')+'"></span>low ';
			html += '<span class="tp checkbox icon_tick'+((localStorage.tp === undefined || localStorage.tp == 2) ? ' checked' : '')+'"></span>mid ';
			html += '<span class="tp checkbox icon_tick'+((localStorage.tp !== undefined && localStorage.tp == 3) ? ' checked' : '')+'"></span>high</span> price to the textarea<br />';
			html += '<br /><button class="button" type="button" id="save">Save</button>';
			zemnmodal.make(html);
			$("#update").click(function()
			{
				$(this).attr("disabled", "true");
				localStorage.removeItem("data");
				update();
			});
			$("#changekey").click(function()
			{
				$(this).prev().val("");
			});
			$("#save").click(function()
			{
				location.reload();
			});
			$(".zemnmodal .checkbox").click(function()
			{
				if ($(this).hasClass("tp"))
				{
					$(".tp.checkbox").removeClass("checked");
					$(this).addClass("checked");
					var index = $(this).index()+1;
					localStorage.tp = index;
				}
				else
				{
					$(this).toggleClass("checked");
					var checked = $(this).hasClass("checked");
					if ($(this).hasClass("n"))
						checked = !checked;
					localStorage[checked ? "setItem" : "removeItem"]($(this).attr("data-name"), "1");
				}
			});
			$(".zemnmodal input[data-name][type='text']").keyup(function()
			{
				var v = Math.min(100, Math.max(0, parseInt(this.value)));
				if (isNaN(v))
					return;
				localStorage.setItem($(this).attr("data-name"), v);
			});
		});
		$(".item").each(function()
		{
			item($(this));
		});
		if ($("body#new").length)
		{
			$("#backpack .item").click(function()
			{
				var i = item($(this));
				if (!i)
				{
					$("#new_form textarea").get(0).value += ($("#new_form textarea").get(0).value != "" ? "\n" : "")+$(this).attr("data-name")+": ";
					return;
				}
				var tp = parseInt(localStorage.tp || 2),
					pt = [],
					b = getprice(143, 6, 1, 1, 0, true, true),
					k = getprice(5021, 6, 1, 1, 0, true, true),
					r = getprice(5002, 6, 1, 1, 0, true, true, true),
					h = $(this).attr("data-hash").split(",");
				if (tp == 1)
					var price = parseFloat(i[0][3]);
				else if (tp == 2)
					var price = (i[0][4] ? (parseFloat(i[0][3])+parseFloat(i[0][4]))/2 : parseFloat(i[0][3]));
				else if (tp == 3)
					var price = parseFloat(i[0][4] || i[0][3]);
				if (i[0][0] == 3)
					price *= b;
				else if (i[0][0] == 2)
					price *= k;
				else if (i[0][0] == 1)
					price *= r;
				price += i[1];
				var dp = price;
				if (num(price, "/", b) > 1)
				{
					var bud = Math.floor(num(price, "/", b));
					pt.push(bud+" bud"+(bud > 1 ? "s" : ""));
					price -= bud*b;
				}
				if (h[1] != 5021 && num(price, "/", k) >= 1)
				{
					var key = Math.floor(num(price, "/", k));
					pt.push(key+" key"+(key > 1 ? "s" : ""));
					price -= key*k;
				}
				if (i[1] < b*2 && num(price, "/", r) >= 0.11)
				{
					var ref = num(price, "/", r),
						rs = ref.toFixed(2);
					ref = parseFloat(rs);
					if (rs.indexOf(".") != -1 && rs.substr(rs.indexOf(".")+1, 1) != rs.substr(rs.indexOf(".")+2, 1))
					{
						var r1 = parseInt(rs.substr(0, rs.indexOf("."))),
							r2 = parseInt(rs.substr(rs.indexOf(".")+1, 1)),
							rd = parseFloat(rs);
						if (rd > parseFloat(r1+"."+r2+r2))
							ref = r1+"."+(++r2)+r2;
						else if (rd-0.05 < parseFloat(r1+"."+r2+r2))
							ref = r1+"."+(--r2)+r2;
						else
							ref = r1+"."+r2+r2;
					}
					pt.push(ref+" ref");
					price -= parseFloat(ref)*r;
				}
				if (price > 0 && dp < r && num(price, "/", r) <= 0.05)
				{
					var ptr = num(price, "/", r);
					if (ptr == 0.05)
						pt.push("1 weapon");
					else
						pt.push(parseFloat((0.05/ptr).toFixed(1))+" for a weapon");
				}
				var q = "";
				switch (h[2])
				{
					case "1": q = "Geniune "; break;
					case "3": q = "Vintage "; break;
					case "5": q = "Unusual "; break;
					case "7": q = "Community "; break;
					case "9": q = "Self-Made "; break;
					case "11": q = "Strange "; break;
					case "13": q = "Haunted "; break;
					case "14": q = "Collector's "; break;
				}
				if (this.aust !== undefined)
					q = "Australium ";
				var paint = (this.paint !== undefined && h[2] != 5) ? " painted "+this.paint : "",
					ef = (this.effect !== undefined && h[2] == 5) ? this.effect+" " : "",
					craft = !this.craft ? "Uncraftable " : "",
					trade = !this.trade ? "Untradable " : "",
					parts = this.parts !== undefined ? " with "+this.parts.join(", ")+" strange part"+(this.parts.length > 1 ? "s" : "") : "",
					noprice = false,
					craftno = "",
					gift = this.gifted !== undefined ? "Gifted " : "",
					killstreak = [],
					kill = "",
					cn = $(this).find(".craft_no");
				if (cn.length && parseInt(cn.html().substr(1)) <= 100)
				{
					noprice = true;
					craftno = "Craft "+cn.html()+" ";
				}
				if (this.sheen !== undefined)
					killstreak.push(this.sheen);
				if (this.streaker !== undefined)
					killstreak.push(this.streaker);
				if (this.kill !== undefined)
					kill = "Killstreak ";
				if (killstreak.length)
					kill += "("+killstreak.join(", ")+") ";
				$("#new_form textarea").get(0).value += ($("#new_form textarea").get(0).value != "" ? "\n" : "")+gift+trade+craft+q+kill+ef+craftno+this.name.replace("The ", "")+parts+paint+": "+(noprice ? "" : pt.join(" + "));
			});
		}
	});
});