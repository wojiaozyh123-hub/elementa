#!/usr/bin/env python3
"""Write the static bilingual pages (support, privacy, making-of) from one shared frame.

Usage: python3 web/tools/make_pages.py   (writes into web/)
"""
import os

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISSUES = 'https://github.com/wojiaozyh123-hub/elementa/issues'

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>@TITLE@</title>
<meta name="description" content="@DESC@">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="https://wojiaozyh123-hub.github.io/elementa/@FILE@">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:title" content="@TITLE@">
<meta property="og:description" content="@DESC@">
<meta property="og:image" content="https://wojiaozyh123-hub.github.io/elementa/og.png">
<meta name="twitter:card" content="summary_large_image">
<script>
  (function () {
    var l = 'auto';
    try { l = (JSON.parse(localStorage.getItem('elementa.settings.v1')) || {}).lang || 'auto'; } catch (e) {}
    if (l !== 'en' && l !== 'zh') {
      var list = navigator.languages || [navigator.language || 'en'];
      l = 'en';
      for (var i = 0; i < list.length; i++) {
        var x = String(list[i]).toLowerCase();
        if (x.indexOf('zh') === 0) { l = 'zh'; break; }
        if (x.indexOf('en') === 0) break;
      }
    }
    document.documentElement.lang = l === 'zh' ? 'zh-Hans' : 'en';
  })();
</script>
<link rel="stylesheet" href="style.css">
</head>
<body class="static">
<header class="top">
  <a class="brand" href="./">
    <span class="mark"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="4.6" y="4" width="1.8" height="16" rx=".9" fill="#ff2a1a"/><rect x="13.4" y="6.5" width="1.8" height="11" rx=".9" fill="#00c8ff"/><rect x="16.8" y="8" width="1.8" height="8" rx=".9" fill="#4f5bff"/><rect x="19.6" y="9" width="1.8" height="6" rx=".9" fill="#8a3cff"/></svg></span>
    <span class="wm"><span data-l="en">Elementa</span><span data-l="zh">元素之声</span></span>
    <span class="sub"><span data-l="en">Hear the Elements</span><span data-l="zh">听见元素周期表</span></span>
  </a>
  <nav class="nav">
    <button type="button" class="ib lang" id="langBtn" aria-label="切换到中文 · Switch to English"><span data-l="en" lang="zh-Hans" aria-hidden="true">中</span><span data-l="zh" lang="en" aria-hidden="true">EN</span></button>
  </nav>
</header>
<main class="page">
'''

FOOT = '''</main>
<footer class="foot">
  <span><span data-l="en">Made by a chemistry student</span><span data-l="zh">一名化学系学生制作</span></span>
  <a href="./"><span data-l="en">Play</span><span data-l="zh">打开元素之声</span></a>
  <a href="making-of.html"><span data-l="en">Making of</span><span data-l="zh">制作过程</span></a>
  <a href="support.html"><span data-l="en">Support</span><span data-l="zh">支持</span></a>
  <a href="privacy.html"><span data-l="en">Privacy</span><span data-l="zh">隐私</span></a>
</footer>
<script>
  (function () {
    var b = document.getElementById('langBtn');
    function label() { b.setAttribute('aria-label', document.documentElement.lang.indexOf('zh') === 0 ? 'Switch to English' : '切换到中文'); }
    label();
    b.addEventListener('click', function () {
    var zh = document.documentElement.lang.indexOf('zh') !== 0;
    document.documentElement.lang = zh ? 'zh-Hans' : 'en';
    label();
    try {
      var s = JSON.parse(localStorage.getItem('elementa.settings.v1')) || {};
      s.lang = zh ? 'zh' : 'en';
      localStorage.setItem('elementa.settings.v1', JSON.stringify(s));
    } catch (e) {}
    });
  })();
</script>
</body>
</html>
'''

SUPPORT = '''  <h1><span data-l="en">Support</span><span data-l="zh">支持</span></h1>
  <p class="sub1"><span data-l="en">Elementa — Hear the Elements, for iPhone, iPad and the web.</span><span data-l="zh">元素之声 — 听见元素周期表（iPhone、iPad 与网页版）。</span></p>

  <h2><span data-l="en">Contact</span><span data-l="zh">联系</span></h2>
  <p data-l="en">Questions, bug reports and ideas are welcome. Email <a href="mailto:3528872473@qq.com">3528872473@qq.com</a> or open an issue at <a href="@ISSUES@">github.com/wojiaozyh123-hub/elementa/issues</a>, and include your device, system version and what you expected to hear.</p>
  <p data-l="zh">欢迎提问、报告问题或提出建议。请发邮件至 <a href="mailto:3528872473@qq.com">3528872473@qq.com</a>，或在 <a href="@ISSUES@">github.com/wojiaozyh123-hub/elementa/issues</a> 提交，并写明你的设备、系统版本，以及你期望听到的声音。</p>

  <h2><span data-l="en">No sound?</span><span data-l="zh">没有声音？</span></h2>
  <ul data-l="en">
    <li>Turn the volume up and tap an element once — browsers only start sound after a tap or a key press.</li>
    <li>On iPhone, check the silent switch (Ring/Silent) and Focus modes; older iOS versions mute web audio when the switch is on.</li>
    <li>If a Bluetooth device just connected or disconnected, reload the page.</li>
  </ul>
  <ul data-l="zh">
    <li>调高音量，然后点一下任意元素——浏览器只有在点击或按键之后才允许播放声音。</li>
    <li>在 iPhone 上，请检查静音开关和专注模式；较旧的 iOS 版本在静音时会让网页没有声音。</li>
    <li>如果刚刚连接或断开了蓝牙设备，请刷新页面。</li>
  </ul>

  <h2><span data-l="en">Common questions</span><span data-l="zh">常见问题</span></h2>
  <p data-l="en"><strong>Why are some elements silent?</strong> Astatine, francium and the elements from fermium onward have no lines in the NIST strong-line tables that Elementa uses. Only tiny amounts of them have ever existed at once.</p>
  <p data-l="zh"><strong>为什么有些元素没有声音？</strong>砹、钫以及从镄开始的元素，在元素之声使用的 NIST 强谱线表中没有谱线；它们同一时间只存在过极少的量。</p>
  <p data-l="en"><strong>Why does sodium wobble?</strong> Its yellow D lines, 589.16 and 589.76 nm, become 462.8 and 462.3 Hz. Played together they beat about once every two seconds. That is real physics, not a glitch.</p>
  <p data-l="zh"><strong>为什么钠的声音会起伏？</strong>钠的黄色 D 双线 589.16 nm 与 589.76 nm 变成 462.8 Hz 与 462.3 Hz，同时响起时大约每两秒起伏一次。这是真实的物理现象，并不是故障。</p>
  <p data-l="en"><strong>What do Pure and Tuned mean?</strong> Pure plays the exact frequencies. Tuned rounds each one to the nearest piano key.</p>
  <p data-l="zh"><strong>“精确”和“钢琴键”有什么区别？</strong>“精确”播放严格换算出的频率；“钢琴键”把每个频率取到最近的钢琴键音高。</p>
  <p data-l="en"><strong>Is the Ear Test the same for everyone?</strong> Yes. Everyone gets the same five elements on the same calendar date, on the web and on iPhone. A new puzzle starts at local midnight. Scores and streaks stay on your device.</p>
  <p data-l="zh"><strong>听音测验对所有人都一样吗？</strong>是的。同一个日期，网页和 iPhone 上所有人听到的五个元素都相同，每天本地时间零点更新。成绩与连续天数只保存在你的设备上。</p>
  <p data-l="en"><strong>Does Elementa collect any data?</strong> No. See the <a href="privacy.html">privacy policy</a>.</p>
  <p data-l="zh"><strong>元素之声会收集数据吗？</strong>不会。详见<a href="privacy.html">隐私政策</a>。</p>
  <p data-l="en"><strong>Which browsers work?</strong> Current Safari, Chrome, Edge and Firefox on computers, iPhone, iPad and Android.</p>
  <p data-l="zh"><strong>支持哪些浏览器？</strong>电脑、iPhone、iPad 和安卓设备上较新版本的 Safari、Chrome、Edge 与 Firefox。</p>
'''

PRIVACY = '''  <h1><span data-l="en">Privacy Policy</span><span data-l="zh">隐私政策</span></h1>
  <p class="sub1"><span data-l="en">Elementa — Hear the Elements · effective 29 September 2026</span><span data-l="zh">元素之声 · 自 2026 年 9 月 29 日起生效</span></p>

  <p data-l="en"><strong>Elementa collects no data.</strong> This applies to the iPhone and iPad app and to this website.</p>
  <p data-l="zh"><strong>元素之声不收集任何数据。</strong>这适用于 iPhone、iPad 应用以及本网站。</p>
  <ul data-l="en">
    <li>No accounts, no sign-in, no analytics, no advertising, no tracking and no cookies.</li>
    <li>The app makes no network requests. Everything it needs — the spectra of all 118 elements and the sound engine — is inside the app.</li>
    <li>The website loads its own files from GitHub Pages and makes no other requests: no fonts, scripts or trackers from anyone else.</li>
    <li>Your settings, Ear Test answers and streak are stored only on your device (in the app, or in your browser’s local storage). Deleting the app or clearing this site’s data removes them.</li>
    <li>When you choose to share, your device’s own share sheet is used. Nothing is sent to us.</li>
  </ul>
  <ul data-l="zh">
    <li>没有账号、没有登录、没有统计分析、没有广告、没有追踪，也没有 Cookie。</li>
    <li>应用不发出任何网络请求。它所需的一切——118 种元素的光谱与声音引擎——都在应用内部。</li>
    <li>网站只从 GitHub Pages 加载自身的文件，不发出其他任何请求：没有第三方字体、脚本或追踪器。</li>
    <li>你的设置、听音测验答案与连续天数只保存在你的设备上（应用内，或浏览器的本地存储中）。删除应用或清除本网站数据即可将其删除。</li>
    <li>当你选择分享时，使用的是设备自带的分享面板，不会向我们发送任何内容。</li>
  </ul>
  <h2><span data-l="en">Hosting</span><span data-l="zh">托管</span></h2>
  <p data-l="en">This website is hosted by GitHub Pages. Like any web host, GitHub may process technical information such as IP addresses to deliver and secure the site; see GitHub’s privacy statement. Elementa itself receives none of it.</p>
  <p data-l="zh">本网站由 GitHub Pages 托管。与所有网站托管服务一样，GitHub 可能会为提供和保护网站而处理 IP 地址等技术信息，详见 GitHub 的隐私声明。元素之声本身不会收到这些信息。</p>
  <h2><span data-l="en">Children</span><span data-l="zh">儿童</span></h2>
  <p data-l="en">Because nothing is collected, Elementa is suitable for all ages.</p>
  <p data-l="zh">由于不收集任何信息，元素之声适合所有年龄段使用。</p>
  <h2><span data-l="en">Changes and contact</span><span data-l="zh">变更与联系</span></h2>
  <p data-l="en">Any change to this policy will be posted on this page. Questions: <a href="mailto:3528872473@qq.com">3528872473@qq.com</a> or <a href="@ISSUES@">github.com/wojiaozyh123-hub/elementa/issues</a>.</p>
  <p data-l="zh">本政策如有变更，将在此页面公布。如有疑问，请发邮件至 <a href="mailto:3528872473@qq.com">3528872473@qq.com</a>，或访问 <a href="@ISSUES@">github.com/wojiaozyh123-hub/elementa/issues</a>。</p>
'''

MAKING = '''  <h1><span data-l="en">How Elementa was made</span><span data-l="zh">元素之声是怎样做出来的</span></h1>
  <p class="sub1"><span data-l="en">A short, honest account.</span><span data-l="zh">一段简短而如实的记录。</span></p>

  <p data-l="en">Elementa was designed and built in a single working session by Claude, Anthropic’s AI coding agent, for a chemistry student who had the idea and made the calls along the way. Here is what that session involved.</p>
  <p data-l="zh">元素之声由 Anthropic 的 AI 编程助手 Claude 在一次连续的工作中设计并构建，为一名化学专业的学生而作——点子和过程中的取舍都来自这位学生。下面是这次工作的内容。</p>

  <h2><span data-l="en">1 · Research</span><span data-l="zh">1 · 调研</span></h2>
  <p data-l="en">Visible light oscillates at hundreds of terahertz — about forty octaves above what we hear. Earlier projects, W. Walker Smith’s musical periodic table and <cite>Atom Tones</cite>, showed that spectra can be listened to. Elementa keeps the mapping as plain as possible: every frequency is divided by exactly 2<sup>40</sup>, with no stretching, so the intervals you hear are the true ratios of the light.</p>
  <p data-l="zh">可见光的振动频率是几百太赫兹——大约比我们能听到的声音高 40 个八度。W. Walker Smith 的“音乐元素周期表”和 <cite>Atom Tones</cite> 等项目已经证明光谱可以被“听”。元素之声让映射尽量简单：每个频率都除以恰好 2<sup>40</sup>，不做任何拉伸，所以你听到的音程就是光本身的真实频率比。</p>

  <h2><span data-l="en">2 · Data pipeline</span><span data-l="zh">2 · 数据处理</span></h2>
  <p data-l="en">The strong-line tables of the NIST <cite>Handbook of Basic Atomic Spectroscopic Data</cite> (Sansonetti &amp; Martin) were downloaded and parsed for every element. Air wavelengths were converted to vacuum with the Ciddor formula, neutral-atom lines were preferred, and each element kept up to 8 visible and 12 ultraviolet-to-infrared lines — skipping near-duplicates that would muddy a chord, but keeping fine-structure doublets so their beating survives. A spectral hue was computed for each element with the CIE 1931 colour-matching functions. Everything fits in one 77 KB file shared by the web and iPhone versions.</p>
  <p data-l="zh">程序下载并解析了 NIST《Handbook of Basic Atomic Spectroscopic Data》（Sansonetti 与 Martin）中每种元素的强谱线表。空气中的波长用 Ciddor 公式换算为真空波长，优先采用中性原子谱线；每种元素最多保留 8 条可见光谱线和 12 条紫外到红外谱线——跳过会让和弦变浑浊的相近谱线，但保留精细结构双线，让“拍”得以保留。每种元素的光谱色由 CIE 1931 配色函数计算。所有数据合在一个 77 KB 的文件里，由网页版和 iPhone 版共用。</p>

  <h2><span data-l="en">3 · Sound</span><span data-l="zh">3 · 声音</span></h2>
  <p data-l="en">Each spectral line is a sine wave with a faint second harmonic, a 6 ms attack and a 1.2 s decay, placed in stereo by its pitch (red left, violet right), then passed through a small hall reverb and a gentle limiter. Because the code’s author cannot hear, the sound was checked numerically: hydrogen and sodium were rendered offline and their spectra measured. Hydrogen’s peaks land at 415, 561, 628 and 665 Hz, and sodium’s doublet beats about once every two seconds, as the physics says it should.</p>
  <p data-l="zh">每条谱线是一个带有微弱二次谐波的正弦波：6 毫秒起音、1.2 秒衰减，按音高放在立体声中的位置（红在左、紫在右），再经过一个小型厅堂混响和一个柔和的限幅器。由于写代码的一方听不见声音，声音是用数字验证的：离线渲染氢和钠，再测量它们的频谱。氢的峰值落在 415、561、628 和 665 Hz，钠的双线大约每两秒起伏一次，正如物理规律所预言。</p>

  <h2><span data-l="en">4 · Web and iPhone</span><span data-l="zh">4 · 网页版与 iPhone 版</span></h2>
  <p data-l="en">The web version is plain HTML, CSS and JavaScript: no frameworks, no build step, no requests to anyone else, and small enough to load quickly anywhere. The iPhone and iPad app is a native app built from the same data and the same sound rules. Both share the daily Ear Test, so everyone hears the same five elements on the same day.</p>
  <p data-l="zh">网页版只用了 HTML、CSS 和 JavaScript：没有框架、没有构建步骤、不向任何第三方发出请求，体积很小，在哪里都能快速加载。iPhone 和 iPad 版是原生应用，使用相同的数据和相同的发声规则。两者共用每日听音测验，所以同一天所有人听到的是同样的五个元素。</p>

  <h2><span data-l="en">Credits</span><span data-l="zh">致谢</span></h2>
  <p data-l="en">Idea and direction: a chemistry student. Design and code: Claude (Anthropic). Spectral data: NIST Atomic Spectra Database. Inspiration: W. Walker Smith (ACS Spring 2023) and <cite>Atom Tones</cite> (Skidmore, 2019).</p>
  <p data-l="zh">创意与方向：一名化学系学生。设计与代码：Claude（Anthropic）。光谱数据：NIST 原子光谱数据库。灵感来源：W. Walker Smith（美国化学会 2023 年春季会议）与 <cite>Atom Tones</cite>（Skidmore，2019）。</p>
  <p><a href="./"><span data-l="en">Open Elementa</span><span data-l="zh">打开元素之声</span></a></p>
'''

PAGES = [
    ('support.html', 'Support — Elementa', 'Help and contact for Elementa — Hear the Elements (元素之声), on iPhone, iPad and the web.', SUPPORT),
    ('privacy.html', 'Privacy Policy — Elementa', 'Elementa collects no data: no accounts, analytics, tracking or cookies. 元素之声不收集任何数据。', PRIVACY),
    ('making-of.html', 'How Elementa was made', 'How Elementa — Hear the Elements was researched, built and checked: NIST data, a 40-octave shift and numerical sound tests.', MAKING),
]

if __name__ == '__main__':
    for name, title, desc, body in PAGES:
        html = (HEAD + body + FOOT).replace('@TITLE@', title).replace('@DESC@', desc).replace('@FILE@', name).replace('@ISSUES@', ISSUES)
        with open(os.path.join(WEB, name), 'w') as f:
            f.write(html)
    print('ok')
