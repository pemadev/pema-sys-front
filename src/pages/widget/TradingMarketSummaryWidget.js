import React, { useEffect, useRef, memo } from 'react';

function TradingMarketSummaryWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const existingScript = document.getElementById('tradingview-market-summary-script');

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tradingview-market-summary-script';
      script.src = 'https://widgets.tradingview-widget.com/w/en/tv-market-summary.js';
      script.type = 'module';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 320,
        background: '#000000',
        color: '#f9fafb',
        padding: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <tv-market-summary
      background-color="#000000"
        color-theme="dark"
        font-family="Arial, sans-serif"
        font-size="14px"
      layout-mode="grid"
        exchange="IDX"
        direction="vertical"
        item-size="compact"
        style={{ display: 'block', width: '100%', height: '100%', minHeight: 320 }}
      ></tv-market-summary>
    </div>
  );
}

export default memo(TradingMarketSummaryWidget);
