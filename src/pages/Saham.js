import React from 'react';
import TradingChartWidget from './widget/TradingChartWidget';
import TradingMarketSummaryWidget from './widget/TradingMarketSummaryWidget';
import TradingViewWidget from './widget/TradingViewWidget';

const styles = {
  page: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: '#f5f5f5',
  },
  leftColumn: {
    width: '50%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  topRow: {
    flex: 1,
    background: '#dce8ff',
    border: '1px solid #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937',
  },
  bottomRow: {
    flex: 1,
    background: '#ffe6d6',
    border: '1px solid #ffffff',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch',
    padding: 0,
    overflow: 'hidden',
  },
  rightColumn: {
    width: '50%',
    height: '100%',
    background: '#e8f5e9',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch',
    border: '1px solid #ffffff',
    overflow: 'hidden',
  },
};

const Saham = () => {
  return (
    <div style={styles.page}>
      <div style={styles.leftColumn}>
        <div style={styles.topRow}>
          <TradingChartWidget />
        </div>
        <div style={styles.bottomRow}>
          <TradingMarketSummaryWidget />
        </div>
      </div>
      <div style={styles.rightColumn}>
        <TradingViewWidget />
      </div>
    </div>
  );
};

export default Saham;