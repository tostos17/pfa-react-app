import React, { useState } from 'react';
import './ui.scss';

export interface TabPaneProps {
  tab: React.ReactNode;
  key: string;
  children: React.ReactNode;
}

interface TabsProps {
  activeKey?: string;
  onChange?: (key: string) => void;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ activeKey, onChange, children }) => {
  const panes = React.Children.toArray(children) as React.ReactElement<TabPaneProps>[];
  const [currentKey, setCurrentKey] = useState(activeKey || panes[0]?.props.key);

  const selectedKey = activeKey ?? currentKey;

  return (
    <div className="ui-tabs">
      <div className="ui-tabs-nav">
        {panes.map((pane) => (
          <button
            key={pane.props.key}
            type="button"
            className={`ui-tabs-tab${pane.props.key === selectedKey ? ' active' : ''}`}
            onClick={() => {
              setCurrentKey(pane.props.key);
              onChange?.(pane.props.key);
            }}
          >
            {pane.props.tab}
          </button>
        ))}
      </div>
      <div className="ui-tabs-content">
        {panes.find((pane) => pane.props.key === selectedKey)?.props.children}
      </div>
    </div>
  );
};

export const TabPane: React.FC<TabPaneProps> = ({ children }) => <>{children}</>;
