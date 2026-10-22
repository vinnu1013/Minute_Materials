const fs = require('fs');
const path = require('path');

const rawData = `Elbow 90°	3917	½	1.5	2225701	15
Elbow 90°	3917	¾	2	2225702	16.5
Elbow 90°	3917	1	2.5	2225703	35
Elbow 90°	3917	1 ¼	3.2	2225704	76.5
Elbow 90°	3917	1 ½	4	2225705	143.5
Elbow 90°	3917	2	5	2225706	296
Reducer Elbow 90°	3917	¾ x ½	2.0 x 1.5	2225707	28.5
Reducer Elbow 90°	3917	1 x ½	2.5 x 1.5	2225708	45.5
Reducer Elbow 90°	3917	1 x ¾	2.5 x 2.0	2225709	69
Reducer Elbow 90°	3917	1 ¼ x ¾	3.2 x 2.0	2225711	82.5
Reducer Elbow 90°	3917	1 ¼ x 1	3.2 x 2.5	2225712	87
Reducer Elbow 90°	3917	1 ½ x ¾	4.0 x 2.0	2225723	110.5
Reducer Elbow 90°	3917	1 ½ x 1	4.0 x 2.5	2225725	134.5
Reducer Elbow 90°	3917	1 ½ x 1 ¼	4.0 x 3.2	2225726	160.5
Reducer Elbow 90°	3917	2 x ¾	5.0 x 2.0	2225727	305
Reducer Elbow 90°	3917	2 x 1	5.0 x 2.5	2225728	312
Reducer Elbow 90°	3917	2 x 1 ¼	5.0 x 3.2	2225729	320.5
Reducer Elbow 90°	3917	2 x 1 ½	5.0 x 4.0	2225730	336
Tee	3917	½	1.5	2226001	20.5
Tee	3917	¾	2	2226002	28
Tee	3917	1	2.5	2226003	43.5
Tee	3917	1 ¼	3.2	2226004	97.5
Tee	3917	1 ½	4	2226005	175
Tee	3917	2	5	2226006	371
Coupler	3917	½	1.5	2224701	11.5
Coupler	3917	¾	2	2224702	14
Coupler	3917	1	2.5	2224703	23.5
Coupler	3917	1 ¼	3.2	2224704	47.5
Coupler	3917	1 ½	4	2224705	85
Coupler	3917	2	5	2224706	179.5
Male Adapter Plastic Threaded - MAPT	3917	½	1.5	2225301	14.5
Male Adapter Plastic Threaded - MAPT	3917	¾	2	2225302	20
Male Adapter Plastic Threaded - MAPT	3917	1	2.5	2225303	30
Male Adapter Plastic Threaded - MAPT	3917	1 ¼	3.2	2225304	52.5
Male Adapter Plastic Threaded - MAPT	3917	1 ½	4	2225305	78
Male Adapter Plastic Threaded - MAPT	3917	2	5	2225306	150
Reducing Male Adapter Plastic Threaded - MAPT	3917	¾ x ½	2.0 x 1.5	2225307	28
Reducing Male Adapter Plastic Threaded - MAPT	3917	1 x ¾	2.5 x 2.0	2225309	37
Female Adapter Plastic Threaded - FAPT	3917	½	1.5	2225401	18.5
Female Adapter Plastic Threaded - FAPT	3917	¾	2	2225402	27
Female Adapter Plastic Threaded - FAPT	3917	1	2.5	2225403	39
Female Adapter Plastic Threaded - FAPT	3917	1 ¼	3.2	2225404	104
Female Adapter Plastic Threaded - FAPT	3917	1 ½	4	2225405	136
Female Adapter Plastic Threaded - FAPT	3917	2	5	2225406	213.5
Union	3917	½	1.5	2225901	50.5
Union	3917	¾	2	2225902	78
Union	3917	1	2.5	2225903	98.5
Union	3917	1 ¼	3.2	2225904	158.5
Union	3917	1 ½	4	2225905	263
Union	3917	2	5	2225906	472.5
End Cap	3917	½	1.5	2224721	9.5
End Cap	3917	¾	2	2224722	12
End Cap	3917	1	2.5	2224723	19.5
End Cap	3917	1 ¼	3.2	2224724	41
End Cap	3917	1 ½	4	2224725	60
End Cap	3917	2	5	2224726	127
Tank Nipple	3917	½	1.5	2223601	52.5
Tank Nipple	3917	¾	2	2223602	57.5
Tank Nipple	3917	1	2.5	2223603	87
Tank Nipple	3917	1 ¼	3.2	2223604	136
Tank Nipple	3917	1 ½	4	2223605	198.5
Tank Nipple	3917	2	5	2223606	312.5
Tank Nipple	3917	2 ½	6.5	2223609	1333.5
Tank Nipple	3917	3	8	2223610	1752
Tank Nipple	3917	4	10	2223621	3354
Tank Nipple (with one side pipe fitment)	3917	¾	2	2223607	48.5
Tank Nipple (with one side pipe fitment)	3917	1	2.5	2223608	76.5
Tank Nipple (with one side pipe fitment)	3917	1 ¼	3.2	2223625	133
Tank Nipple (with one side pipe fitment)	3917	1 ½	4	2223626	181.5
Tank Nipple (with one side pipe fitment)	3917	2	5	2223627	317.5
Hex Nipple	3917	¾	2	2223707	21
Hex Nipple	3917	1	2.5	2223708	35
Hex Nipple	3917	1 ¼	3.2	2223709	53.5
Hex Nipple	3917	1 ½	4	2223710	80
Hex Nipple	3917	2	5	2223711	119
Elbow 45°	3917	½	1.5	2225801	17
Elbow 45°	3917	¾	2	2225802	25
Elbow 45°	3917	1	2.5	2225803	43
Elbow 45°	3917	1 ¼	3.2	2225804	97.5
Elbow 45°	3917	1 ½	4	2225805	149.5
Elbow 45°	3917	2	5	2225806	308
3 Way Elbow	3917	¾	2	2225722	47.5
Reducer Coupler	3917	¾ x ½	2.0 x 1.5	2224601	21
Reducer Coupler	3917	1 x ½	2.5 x 1.5	2224602	30
Reducer Coupler	3917	1 x ¾	2.5 x 2.0	2224603	33
Reducer Coupler	3917	1 ¼ x ½	3.2 x 1.5	2224604	70
Reducer Coupler	3917	1 ¼ x ¾	3.2 x 2.0	2224605	66.5
Reducer Coupler	3917	1 ¼ x 1	3.2 x 2.5	2224606	71.5
Reducer Coupler	3917	1 ½ x ½	4.0 x 1.5	2224607	102.5
Reducer Coupler	3917	1 ½ x ¾	4.0 x 2.0	2224608	113
Reducer Coupler	3917	1 ½ x 1	4.0 x 2.5	2224609	104
Reducer Coupler	3917	1 ½ x 1 ¼	4.0 x 3.2	2224610	99
Reducer Coupler	3917	2 x ½	5.0 x 1.5	2224611	205
Reducer Coupler	3917	2 x ¾	5.0 x 2.0	2224612	239.5
Reducer Coupler	3917	2 x 1	5.0 x 2.5	2224613	175
Reducer Coupler	3917	2 x 1 ¼	5.0 x 3.2	2224614	191.5
Reducer Coupler	3917	2 x 1 ½	5.0 x 4.0	2224615	238.5
Converter Bushing (CTS)	3917	½	1.5	2224781	12.5
Converter Bushing (CTS)	3917	¾	2	2224782	15
Converter Bushing (CTS)	3917	1	2.5	2224783	22.5
Converter Bushing (CTS)	3917	1 ¼	3.2	2224784	40
Converter Bushing (CTS)	3917	1 ½	4	2224785	51
Converter Bushing (CTS)	3917	2	5	2224786	77.5
Bushing	3917	¾ x ½	2.0 x 1.5	2224751	11.5
Bushing	3917	1 x ½	2.5 x 1.5	2224752	25
Bushing	3917	1 x ¾	2.5 x 2.0	2224753	17
Bushing	3917	1 ¼ x ½	3.2 x 1.5	2224754	47
Bushing	3917	1 ¼ x ¾	3.2 x 2.0	2224755	34
Bushing	3917	1 ¼ x 1	3.2 x 2.5	2224756	29.5
Bushing	3917	1 ½ x ½	4.0 x 1.5	2224757	71.5
Bushing	3917	1 ½ x ¾	4.0 x 2.0	2224758	53.5
Bushing	3917	1 ½ x 1	4.0 x 2.5	2224759	52.5
Bushing	3917	1 ½ x 1 ¼	4.0 x 3.2	2224760	38.5
Bushing	3917	2 x ½	5.0 x 1.5	2224761	113
Bushing	3917	2 x ¾	5.0 x 2.0	2224762	104
Bushing	3917	2 x 1	5.0 x 2.5	2224763	104.5
Bushing	3917	2 x 1 ¼	5.0 x 3.2	2224764	112.5
Bushing	3917	2 x 1 ½	5.0 x 4.0	2224765	93.5
Reducer Tee	3917	¾ x ¾ x ½	1.5 x 1.5 x 2.0	2224901	44
Reducer Tee	3917	½ x ½ x ¾	2.0 x 1.5 x 1.5	2224902	44.5
Reducer Tee	3917	¾ x ½ x ¾	2.0 x 1.5 x 2.0	2224903	40.5
Reducer Tee	3917	¾ x ¾ x ½	2.0 x 2.0 x 1.5	2224904	45
Reducer Tee	3917	1 x 1 x ½	2.5 x 2.5 x 1.5	2224905	71.5
Reducer Tee	3917	1 x 1 x ¾	2.5 x 2.5 x 2.0	2224906	81.5
Reducer Tee	3917	1 ¼ x 1 ¼ x ½	3.2 x 3.2 x 1.5	2224907	128
Reducer Tee	3917	1 ¼ x 1 ¼ x ¾	3.2 x 3.2 x 2.0	2224908	150.5
Reducer Tee	3917	1 ¼ x 1 ¼ x 1	3.2 x 3.2 x 2.5	2224909	125
Reducer Tee	3917	1 ½ x 1 ½ x ½	4.0 x 4.0 x 1.5	2224910	206.5
Reducer Tee	3917	1 ½ x 1 ½ x ¾	4.0 x 4.0 x 2.0	2224911	205.5
Reducer Tee	3917	1 ½ x 1 ½ x 1	4.0 x 4.0 x 2.5	2224912	204
Reducer Tee	3917	1 ½ x 1 ½ x 1 ¼	4.0 x 4.0 x 3.2	2224913	199.5
Reducer Tee	3917	2 x 2 x ½	5.0 x 5.0 x 1.5	2224914	380.5
Reducer Tee	3917	2 x 2 x ¾	5.0 x 5.0 x 2.0	2224915	395
Reducer Tee	3917	2 x 2 x 1	5.0 x 5.0 x 2.5	2224916	381
Reducer Tee	3917	2 x 2 x 1 ¼	5.0 x 5.0 x 3.2	2224917	420.5
Reducer Tee	3917	2 x 2 x 1 ½	5.0 x 5.0 x 4.0	2224918	389.5
Elbow 90° (Brass)	3917	½ x ½	1.5 x 1.5	2226101	62
Elbow 90° (Brass)	3917	¾ x ½	2.0 x 1.5	2226102	65
Elbow 90° (Brass)	3917	¾ x ¾	2.0 x 2.0	2226103	91.5
Elbow 90° (Brass)	3917	1 x ½	2.5 x 1.5	2226104	122.5
Elbow 90° (Brass)	3917	1 x ¾	2.5 x 2.0	2226107	188.5
Elbow 90° (Brass)	3917	1 x 1	2.5 x 2.5	2226105	366
Elbow 90° (Brass)	3917	1 ¼ x ½	3.2 x 1.5	2226108	223.5
Elbow 90° (Brass)	3917	1 ¼ x ¾	3.2 x 2.0	2226109	262.5
Elbow 90° (Brass)	3917	1 ¼ x 1 ¼	3.2 x 3.2	2226106	474.5
Brass Elbow With Clamp	3917	¾ x ½	2.0 x 1.5	2229302	88.5
Tee (Brass)	3917	½ x ½ x ½	1.5 x 1.5 x 1.5	2225601	80
Tee (Brass)	3917	¾ x ¾ x ½	2.0 x 2.0 x 1.5	2225602	81
Tee (Brass)	3917	¾ x ¾ x ¾	2.0 x 2.0 x 2.0	2225605	120
Tee (Brass)	3917	1 x 1 x ½	2.5 x 2.5 x 1.5	2225603	139
Tee (Brass)	3917	1 x 1 x ¾	2.5 x 2.5 x 2.0	2225604	205
Tee (Brass)	3917	1 x 1 x 1	2.5 x 2.5 x 2.5	2225607	256.5
Tee (Brass)	3917	1 ¼ x 1 ¼ x ½	3.2 x 3.2 x 1.5	2225606	257
Male Adapter Brass Threaded - MABT	3917	½	1.5	2225201	147
Male Adapter Brass Threaded - MABT	3917	¾	2	2225202	188.5
Male Adapter Brass Threaded - MABT	3917	1	2.5	2225203	292.5
Male Adapter Brass Threaded - MABT	3917	1 ¼	3.2	2225204	607.5
Male Adapter Brass Threaded - MABT	3917	1 ½	4	2225205	758
Male Adapter Brass Threaded - MABT	3917	2	5	2225206	1452.5
Male Adapter Brass Threaded - MABT	3917	2 ½	6.5	2225210	2225.5
Male Adapter Brass Threaded - MABT	3917	3	8	2225211	3085
Reducing Male Adapter Brass Threaded - MABT	3917	¾ x ½	2.0 x 1.5	2225207	114
Reducing Male Adapter Brass Threaded - MABT	3917	1 x ½	2.5 x 1.5	2225208	212
Reducing Male Adapter Brass Threaded - MABT	3917	1 x ¾	2.5 x 2.0	2225209	208
Union - MABT	3917	¾	2	2226202	271
Union - MABT	3917	1	2.5	2226203	444
Female Adapter Brass Threaded - FABT	3917	½	1.5	2225101	141.5
Female Adapter Brass Threaded - FABT	3917	¾	2	2225102	188.5
Female Adapter Brass Threaded - FABT	3917	1	2.5	2225103	292.5
Female Adapter Brass Threaded - FABT	3917	1 ¼	3.2	2225104	618.5
Female Adapter Brass Threaded - FABT	3917	1 ½	4	2225105	692
Female Adapter Brass Threaded - FABT	3917	2	5	2225106	1328.5
Female Adapter Brass Threaded - FABT	3917	2 ½	6.5	2225110	2301.5
Female Adapter Brass Threaded - FABT	3917	3	8	2225111	3046
Reducing Female Adapter Brass Threaded - FABT	3917	¾ x ½	2.0 x 1.5	2225107	80.5
Reducing Female Adapter Brass Threaded - FABT	3917	1 x ½	2.5 x 1.5	2225108	103.5
Reducing Female Adapter Brass Threaded - FABT	3917	1 x ¾	2.5 x 2.0	2225109	109
Union FABT	3917	¾	2	2226302	259.5
Union FABT	3917	1	2.5	2226303	423.5
Brass Elbow MABT	3917	¾ x ½	2.0 x 1.5	2229207	168
Brass Tee - MABT	3917	¾ x ¾ x ½	2.0 x 2.0 x 1.5	2221602	107
Brass Elbow Long	3917	¾ x ½	2.0 x 1.5	2229102	176
3 in 1 Mixer Adaptor All Top (6")	3917	¾ x ½	2.0 x 1.5	2221007	357
3 in 1 Mixer Adaptor All Top (6")	3917	1 x ½	2.5 x 1.5	2221005	435.5
3 in 1 Mixer Adaptor Top and Bottom (6")	3917	¾ x ½	2.0 x 1.5	2221107	357
3 in 1 Mixer Adaptor Top and Bottom (6")	3917	1 x ½	2.5 x 1.5	2221105	435.5
3 in 1 Mixer Adaptor Top and Side (6")	3917	¾ x ½	2.0 x 1.5	2221207	357
3 in 1 Mixer Adaptor Top and Side (6")	3917	1 x ½	2.5 x 1.5	2221205	435.5
3 in 1 Mixer Adaptor Hot Up and Cold Down (6")	3917	¾ x ½	2.0 x 1.5	2221017	357
3 in 1 Mixer Adaptor Hot Up and Cold Down (6")	3917	1 x ½	2.5 x 1.5	2221015	435.5
3 in 1 Mixer Adaptor Hot Side and Cold Down (6")	3917	¾ x ½	2.0 x 1.5	2221027	357
3 in 1 Mixer Adaptor Hot Side and Cold Down (6")	3917	1 x ½	2.5 x 1.5	2221025	435.5
3 in 1 Mixer Adaptor All Top (7")	3917	¾ x ½	2.0 x 1.5	2222007	357
3 in 1 Mixer Adaptor All Top (7")	3917	1 x ½	2.5 x 1.5	2222005	435.5
3 in 1 Mixer Adaptor Top and Bottom (7")	3917	¾ x ½	2.0 x 1.5	2222107	357
3 in 1 Mixer Adaptor Top and Bottom (7")	3917	1 x ½	2.5 x 1.5	2222105	435.5
Top and Side (7")	3917	¾ x ½	2.0 x 1.5	2222207	357
Top and Side (7")	3917	1 x ½	2.5 x 1.5	2222205	435.5
Hot Up and Cold Down (7")	3917	¾ x ½	2.0 x 1.5	2222017	357
Hot Up and Cold Down (7")	3917	1 x ½	2.5 x 1.5	2222015	435.5
Hot Side and Cold Down (7")	3917	¾ x ½	2.0 x 1.5	2222027	357
Hot Side and Cold Down (7")	3917	1 x ½	2.5 x 1.5	2222025	435.5
3 in 1 Mixer Adaptor With MABT Top	3917	¾ x ½	2.0 x 1.5	2221407	565
3 in 1 Mixer Adaptor With MABT Bottom	3917	¾ x ½	2.0 x 1.5	2221507	565
3 in 1 Mixer Adaptor With MABT Top and Side	3917	¾ x ½	2.0 x 1.5	2221607	565
Kitchen Mixer Adaptor Down	3917	¾ x ½	2.0 x 1.5	2224007	305.5
Kitchen Mixer Adaptor Straight	3917	¾ x ½	2.0 x 1.5	2224107	270
Extension Nipple - CP	3917	½ x 1	1.5 x 2.5	2229402	85.5
Extension Nipple - CP	3917	½ x 1 ½	1.5 x 4.0	2229403	114
Extension Nipple - CP	3917	½ x 2	1.5 x 5.0	2229404	158.5
Extension Nipple - CP	3917	½ x 2 ½	1.5 x 6.5	2229406	198.5
Extension Nipple - CP	3917	½ x 3	1.5 x 8.0	2229407	245.5
Ball Valve	3917	½	1.5	2224771	87.5
Ball Valve	3917	¾	2	2224772	154.5
Ball Valve	3917	1	2.5	2224773	289.5
Ball Valve	3917	1 ¼	3.2	2224774	508.5
Ball Valve	3917	1 ½	4	2224775	799.5
Ball Valve	3917	2	5	2224776	1402.5
Ball Valve With Brass Threaded (One Side)	3917	¾	2	2224871	215.5
Ball Valve With Brass Threaded (One Side)	3917	1	2.5	2224872	377
Ball Valve With Brass Threaded (One Side)	3917	1 ¼	3.2	2224874	676.5
Ball Valve With Brass Threaded (Two Side)	3917	¾	2	2224971	260
Ball Valve With Brass Threaded (Two Side)	3917	1	2.5	2224972	458
Ball Valve With Brass Threaded (Two Side)	3917	1 ¼	3.2	2224974	799
Ball Valve - Handle	3917	½	1.5	2271021	15
Ball Valve - Handle	3917	¾	2	2271022	22.5
Ball Valve - Handle	3917	1	2.5	2271023	34.5
Ball Valve - Handle	3917	1 ¼	3.2	2271024	53.5
Ball Valve - Handle	3917	1 ½	4	2271025	65
Ball Valve - Handle	3917	2	5	2271026	100.5
Non Return Valve	3917	¾	2	2229702	258
Non Return Valve	3917	1	2.5	2229703	494.5
Cross Tee	3917	½	1.5	2226007	29.5
Cross Tee	3917	¾	2	2226008	62
Cross Tee	3917	1	2.5	2226009	103.5
Tee Holder	3917	½ x ½ x ½	1.5 x 1.5 x 1.5	2224401	6.5
Tee Holder	3917	¾ x ¾ x ½	2.0 x 2.0 x 1.5	2224402	9
Tee Holder	3917	1 x 1 x ½	2.5 x 2.5 x 1.5	3824403	9
Elbow Holder	3917	½ x ½	1.5 x 1.5	2223301	6.5
Elbow Holder	3917	½ x ¾	1.5 x 2.0	2223302	7
Threaded End Plug	3917	½	1.5	2223501	8
Threaded End Plug	3917	¾	2	2223502	10
Expansion Loop	3917	½	1.5	2224801	61
Expansion Loop	3917	¾	2	2224802	109.5
Expansion Loop	3917	1	2.5	2224803	191.5
Expansion Loop	3917	1 ¼	3.2	2224804	359
Expansion Loop	3917	1 ½	4	2224805	556
Expansion Loop	3917	2	5	2224806	1132
Step Over Bend	3917	½	1.5	2227101	58
Step Over Bend	3917	¾	2	2227102	78.5
Step Over Bend	3917	1	2.5	2227103	151.5
Step Over Bend	3917	1 ¼	3.2	2227104	272
Step Over Bend	3917	1 ½ (F)	4	2227105	254
Step Over Bend	3917	2 (F)	5	2227106	604.5
Short Bend	3917	½	1.5	-	500
Short Bend	3917	¾	2	-	300
Short Bend	3917	1	2.5	-	200
Short Bend	3917	1 ¼	3.2	-	150
Short Bend	3917	1 ½	4	-	100
Short Bend	3917	2	5	-	50
Sweep Bend - Socket at Both Sides	3917	¾	2	-	600
Sweep Bend - Socket at Both Sides	3917	1	2.5	-	300
Sweep Bend - Socket at Both Sides	3917	1 ¼	3.2	-	180
Flange with Gasket - End Cap Open	3917	1	2.5	-	90
Flange with Gasket - End Cap Open	3917	1 ¼	3.2	-	60
Flange with Gasket - End Cap Open	3917	1 ½	4	-	40
Flange with Gasket - End Cap Open	3917	2	5	-	30
Flange with Gasket - End Cap Closed	3917	1	2.5	-	100
Flange with Gasket - End Cap Closed	3917	1 ¼	3.2	-	80
Flange with Gasket - End Cap Closed	3917	1 ½	4	-	70
Flange with Gasket - End Cap Closed	3917	2	5	-	50
1 Step CPVC Yellow Medium Solvent Cement	3506	0.5 oz	15 ml Tube	4081099	500
1 Step CPVC Yellow Medium Solvent Cement	3506	1 oz	29.5 ml Tube	4081100	240
1 Step CPVC Yellow Medium Solvent Cement	3506	2 oz	59 ml Tube	4081101	144
1 Step CPVC Yellow Medium Solvent Cement	3506	2 oz	59 ml Tin	4081106	384
1 Step CPVC Yellow Medium Solvent Cement	3506	4 oz	118 ml Tin	4081102	192
1 Step CPVC Yellow Medium Solvent Cement	3506	8 oz	237 ml Tin	4081103	96
1 Step CPVC Yellow Medium Solvent Cement	3506	16 oz	473 ml Tin	4081104	24
1 Step CPVC Yellow Medium Solvent Cement	3506	32 oz	946 ml Tin	4081105	24
2 Step CPVC Heavy Duty Orange Solvent Cement	3506	4 oz	118 ml Tin	4081201	192
2 Step CPVC Heavy Duty Orange Solvent Cement	3506	8 oz	237 ml Tin	4081202	96
2 Step CPVC Heavy Duty Orange Solvent Cement	3506	16 oz	473 ml Tin	4081203	24
2 Step CPVC Heavy Duty Orange Solvent Cement	3506	32 oz	946 ml Tin	4081204	24
Purple Primer Solvent Cement	3506	8 oz	237 ml Tin	4071503	96
Union (SCH 80)	3917	2 ½	6.5	2229002	1209
Union (SCH 80)	3917	3	8	2229003	1648
Union (SCH 80)	3917	4	10	2229004	2569.5
SS Bolts for Butterfly Valves	7307	M12 X 125MM	-	3822207	192
SS Bolts for Butterfly Valves	7307	M16 X 125MM	-	3822208	283.5
SS Bolts for Butterfly Valves	7307	M16 X 150MM	-	3822209	326.5
SS Bolts for Butterfly Valves	7307	M16 X 160MM	-	3822210	339
Butterfly Valve	3917	1 ½	4	2524106	7276
Butterfly Valve	3917	2	5	2524107	7938.5
Butterfly Valve	3917	2 ½	6.5	2524108	10746.5
Butterfly Valve	3917	3	8	2524109	13000.5
Butterfly Valve	3917	4	10	2524111	14066
Butterfly Valve	3917	6	15	2524115	21762.5
Ball Valve	3917	2 ½	6.5	2522108	11462.5
Ball Valve	3917	3	8	2522109	14802
Ball Valve	3917	4	10	2522111	20834
Body in CPVC	3917	½	1.5	2561001	135
Body in CPVC	3917	¾	2	2561002	160.5
Body in CPVC	3917	1	2.5	2561003	272
Brass Mechanism	8481	½ and ¾	Long, QT	2569003	289.5
Brass Mechanism	8481	½ and ¾	Long, FT	2569004	295.5
Brass Mechanism	8481	½ and ¾	Short, QT	2569001	257.5
Brass Mechanism	8481	½ and ¾	Short, FT	2569002	264
Brass Mechanism	8481	1	Long, QT	2569103	368
Brass Mechanism	8481	1	Long, FT	2569104	409
Brass Mechanism	8481	1	Short, QT	2569101	327
Brass Mechanism	8481	1	Short, FT	2569102	347.5
Extension Tube	7307	Long	-	2569011	135
Extension Tube	7307	Short	-	2569012	78
Flange	8481	-	-	2229009	98
Knobs	7307	Plastic	-	2569016	306
Knobs	7307	Round	-	2569015	306
Knobs	7307	Square	-	2569014	148.5
Knobs	7307	Triangle	-	2569013	148.5
Ceramic Disc	8481	-	-	2569005	84
Allen Key (for round Knob)	8204	-	-	2569020	13
Grub Screw (for round Knob)	7318	-	-	2569021	4
Screw with Washer (for triangle and square knob)	7318	-	-	2569019	7
Red & Blue Buttons	8481	-	-	2569022	13.5
Rubber Washer (Spares for Diverter)	4016	-	-	2569023	8
Threaded End Plug (Spares for Diverter)	3917	-	-	2569501	4.5
Spindle (Spares for Diverter)	8207	Medium Flow	-	2581001	343
Spindle (Spares for Diverter)	8207	High Flow	-	2591001	555
Sleeve Flange (Spares for Diverter)	7307	Medium Flow	-	2591006	59
Sleeve Flange (Spares for Diverter)	7307	High Flow	-	2591007	203
Body Sleeve and O-ring (Spares for Diverter)	8481	Medium Flow	-	2581003	234
Body Sleeve and O-ring (Spares for Diverter)	8481	High Flow	-	2591003	855
Cartridge (Spares for Diverter)	3917	Medium Flow	-	2581004	455
Cartridge (Spares for Diverter)	3917	High Flow	-	2591004	812
Hex Nut (Spares for Diverter)	8207	Medium Flow	-	2581005	73
Hex Nut (Spares for Diverter)	8207	High Flow	-	2591005	457
Extension Tube (Spares for Diverter)	8207	High Flow	-	2591002	130
FV Operating Mechanism (Spares for Diverter)	3917	-	-	2592101	697
FV Wall Flange with Washer (Spares for Diverter)	7307	-	-	2592102	301
YS Filter Mesh (Spares for Diverter)	7307	1	2.5	2593101	30
YS Filter Mesh (Spares for Diverter)	7307	1 ¼	3.2	2593102	41
YS Hex Nut (Spares for Diverter)	8207	1	2.5	2593103	211
YS Hex Nut (Spares for Diverter)	8207	1 ¼	3.2	2593104	299`;

const lines = rawData.split('\n').filter(l => l.trim().length > 0);

const plumbingProducts = lines.map((line, idx) => {
  const parts = line.split('\t').map(p => p.trim());
  const name = parts[0] || 'Plumbing Material';
  const hsnCode = parts[1] || '';
  const sizeInch = parts[2] || '';
  const sizeCm = parts[3] || '';
  const partNo = parts[4] || '';
  const rawMrp = parts[5] || '0';

  let numMrp = parseFloat(rawMrp.replace(/[^0-9.]/g, ''));
  if (isNaN(numMrp)) numMrp = 0;

  // Add 20% extra to the price provided
  // price (selling price) = provided * 1.20
  // original price = price * 1.20 (so it displays 20% discount on original price)
  const price = numMrp > 0 ? Math.round(numMrp * 1.20 * 100) / 100 : 0;
  const originalPrice = price > 0 ? Math.round(price * 1.20 * 100) / 100 : undefined;

  let fullName = name;
  if (sizeInch && sizeInch !== '-') fullName += ` ${sizeInch}`;
  if (sizeCm && sizeCm !== '-') fullName += ` (${sizeCm} cm)`;

  const sku = (partNo && partNo !== '-' && partNo !== 'x') ? `PLM-${partNo}` : `PLM-${idx + 101}`;

  return {
    id: `p-${(idx + 1).toString().padStart(3, '0')}`,
    name: fullName,
    category: 'plumbing',
    subcategory: 'Fittings & Valves',
    price: price,
    originalPrice: originalPrice,
    unit: 'ea',
    stockStatus: 'in_stock',
    stockCount: 100,
    sku: sku,
    hsnCode: hsnCode,
    partCode: (partNo && partNo !== '-' && partNo !== 'x') ? partNo : undefined,
    description: '',
    image: '',
    popular: false
  };
});

// Electrical sample items
const electricalProducts = [
  {
    id: 'e-01',
    name: '1.5 sq mm FR PVC Copper Wire (90M Roll Red)',
    category: 'electrical',
    subcategory: 'Wires & Cable',
    price: 1500.00,
    originalPrice: 1800.00,
    unit: 'roll',
    stockStatus: 'in_stock',
    stockCount: 50,
    sku: 'ELE-WIR-15SQ-RED',
    hsnCode: '85444999',
    partCode: 'WIR-CU-15FR-90M-R',
    description: '',
    image: '',
    popular: false
  },
  {
    id: 'e-02',
    name: '20 Amp Single-Pole MCB Circuit Breaker (C-Curve)',
    category: 'electrical',
    subcategory: 'Panels & Breakers',
    price: 222.00,
    originalPrice: 266.40,
    unit: 'ea',
    stockStatus: 'in_stock',
    stockCount: 180,
    sku: 'ELE-MCB-1P-20A',
    hsnCode: '85362090',
    partCode: 'BRK-MCB-1P20A-C',
    description: '',
    image: '',
    popular: false
  },
  {
    id: 'e-03',
    name: '16A Modular Switch & 3-Pin Socket Combo with Indicator Box',
    category: 'electrical',
    subcategory: 'Switches & Outlets',
    price: 288.00,
    originalPrice: 345.60,
    unit: 'set',
    stockStatus: 'in_stock',
    stockCount: 95,
    sku: 'ELE-MOD-16A-CMB',
    hsnCode: '85366990',
    partCode: 'SWI-SOC-16A-MOD',
    description: '',
    image: '',
    popular: false
  }
];

const allProducts = [...plumbingProducts, ...electricalProducts];

const tsOutput = `import { Product, StoreSettings } from '../types';

export const INITIAL_PRODUCTS: Product[] = ${JSON.stringify(allProducts, null, 2)};

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: 'Plumbing and Elctrical Express delivery',
  helplineNumber: '9059236500',
  whatsappNumber: '9059236500',
  deliveryFeeExpress: 15.00,
  deliveryFeeStandard: 5.00,
  minOrderFreeDelivery: 199.00,
  activeDeliveryNotice: '⚠️ Website under building stage! Please book strictly via WhatsApp or Phone: 9059236500 | 10 to 15 Min Express Delivery',
  adminPin: 'SnapSupply10',
  depotLat: 17.343629,
  depotLng: 78.554161,
  depotAddress: 'SnapSupply Express Hub'
};
`;

const targetPath = path.join(process.cwd(), 'src/data/initialProducts.ts');
fs.writeFileSync(targetPath, tsOutput);
console.log(`Generated ${allProducts.length} total products (${plumbingProducts.length} plumbing items). Target: ${targetPath}`);
