import * as React from "react";
import {
  View,
  Animated,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList
} from "react-native";
import {
  ScrollableTabView,
  ITab,
  ScrollEventHandler
} from "./ScrollableTabView";
import { Ref, createRef } from "react";

export interface IProps {
  headerOffset: number;
  activeTabKey: string;
  tabs: ITab[];
  renderTab: (params: {
    ref: Ref<FlatList<any>>;
    tab: ITab;
    isActive: boolean;
    onScroll: ScrollEventHandler;
    onScrollBeginDrag: ScrollEventHandler;
    onScrollEndDrag: ScrollEventHandler;
    onMomentumScrollEnd: ScrollEventHandler;
  }) => JSX.Element;
  onTabChange: (params: { tab: ITab }) => void;
  renderHeader: (params: {
    offsetY: Animated.AnimatedInterpolation;
  }) => JSX.Element;
}

export interface IState {
  parallaxOffsetValue: Animated.AnimatedInterpolation;
}

export class ParallaxScrollableTabView extends React.Component<IProps, IState> {
  parallaxOffset: number = 0;
  tabRefs: Map<string, Ref<FlatList<any>>> = new Map();
  tabScrollOffsets: Map<string, number> = new Map();
  tabParallaxInterpolateLowerBounds: Map<string, number> = new Map();
  tabScrollOffsetValues: Map<string, Animated.Value> = new Map();

  constructor(props) {
    super(props);

    let { activeTabKey, headerOffset, tabs } = this.props;

    for (let tab of tabs) {
      let tabRef = createRef<FlatList<any>>();
      let scrollOffsetValue = new Animated.Value(0);
      scrollOffsetValue.addListener(() => {});

      this.tabRefs.set(tab.key, tabRef);
      this.tabScrollOffsets.set(tab.key, 0);
      this.tabParallaxInterpolateLowerBounds.set(tab.key, 0);
      this.tabScrollOffsetValues.set(tab.key, scrollOffsetValue);
    }

    this.state = {
      parallaxOffsetValue: this.generateParallaxOffsetValue(activeTabKey)
    };
  }

  generateParallaxOffsetValue(tabKey: string) {
    let { headerOffset } = this.props;
    let tabParallaxInterpolateLowerBound = this.tabParallaxInterpolateLowerBounds.get(
      tabKey
    );
    let tabScrollOffsetValue = this.tabScrollOffsetValues.get(tabKey);

    return tabScrollOffsetValue.interpolate({
      inputRange: [
        tabParallaxInterpolateLowerBound,
        tabParallaxInterpolateLowerBound + headerOffset
      ],
      outputRange: [0, -headerOffset],
      extrapolate: "clamp"
    });
  }

  checkParallaxInterpolateLowerBound(tabKey, offsetY) {
    if (offsetY < 0) {
      return;
    }

    let needRebind = false;
    const { headerOffset } = this.props;
    const tabParallaxInterpolateLowerBound = this.tabParallaxInterpolateLowerBounds.get(
      tabKey
    );
    const parallaxOffset = this.state.parallaxOffsetValue.__getValue();
    const tabScrollOffset = this.tabScrollOffsets.get(tabKey);
    const deltaY = offsetY - tabScrollOffset;
    if (
      Math.abs(parallaxOffset) === headerOffset &&
      tabParallaxInterpolateLowerBound !== 0
    ) {
      this.tabParallaxInterpolateLowerBounds.set(tabKey, 0);
      needRebind = true;
    } else if (
      deltaY > 0 &&
      parallaxOffset === 0 &&
      tabParallaxInterpolateLowerBound !== 0
    ) {
      this.tabParallaxInterpolateLowerBounds.set(tabKey, tabScrollOffset);
      needRebind = true;
    }

    if (needRebind) {
      this.setState({
        parallaxOffsetValue: this.generateParallaxOffsetValue(tabKey)
      });
    }
  }

  updateParallaxInterpolateLowerBound(tabKey: string) {
    if (this.tabScrollOffsets[tabKey] <= -this.parallaxOffset) {
      this.tabScrollOffsets.set(tabKey, -this.parallaxOffset);
      this.tabParallaxInterpolateLowerBounds.set(tabKey, 0);
    } else {
      this.tabParallaxInterpolateLowerBounds.set(
        tabKey,
        this.tabScrollOffsets.get(tabKey) + this.parallaxOffset
      );
    }
  }

  onTabChange = ({ tab }: { tab: ITab }) => {
    this.updateParallaxInterpolateLowerBound(tab.key);

    this.setState({
      parallaxOffsetValue: this.generateParallaxOffsetValue(tab.key)
    });

    if (this.props.onTabChange) {
      this.props.onTabChange({ tab });
    }
  };

  synchronizeScrollOffsets() {
    const parallaxOffset = this.state.parallaxOffsetValue.__getValue();
    const delta = parallaxOffset - this.parallaxOffset;
    if (delta === 0) {
      return;
    }

    const { activeTabKey } = this.props;

    this.tabRefs.forEach((tabRef, tabKey) => {
      if (tabKey !== activeTabKey) {
        const tabScrollOffset = this.tabScrollOffsets.get(tabKey);
        const syncedScrollOffset = tabScrollOffset + delta;
        const tabScrollOffsetValue = this.tabScrollOffsetValues.get(tabKey);
        if (tabRef && tabRef.current) {
          tabRef.current.scrollToOffset({
            offset: syncedScrollOffset,
            animated: false
          });
        }
        this.tabScrollOffsets.set(tabKey, syncedScrollOffset);
        tabScrollOffsetValue.setValue(syncedScrollOffset);
      }
    });

    this.parallaxOffset = parallaxOffset;
  }

  onScroll = (tab: ITab) => {
    return Animated.event(
      [
        {
          nativeEvent: {
            contentOffset: {
              y: this.tabScrollOffsetValues.get(tab.key)
            }
          }
        }
      ],
      {
        useNativeDriver: true,
        listener: ({
          nativeEvent: {
            contentOffset: { y }
          }
        }: NativeSyntheticEvent<NativeScrollEvent>) => {
          this.checkParallaxInterpolateLowerBound(tab.key, y);
          this.tabScrollOffsets.set(tab.key, y);
        }
      }
    );
  };

  onScrollBeginDrag = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.parallaxOffset = this.state.parallaxOffsetValue.__getValue();
  };

  onScrollEndDrag = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.synchronizeScrollOffsets();
  };

  onMomentumScrollEnd = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.synchronizeScrollOffsets();
  };

  render() {
    const {
      headerOffset,
      activeTabKey,
      tabs,
      renderTab,
      renderHeader
    } = this.props;
    const { parallaxOffsetValue } = this.state;

    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: headerOffset
          }
        ]}
      >
        <ScrollableTabView
          activeTabKey={activeTabKey}
          tabs={tabs}
          onTabChange={this.onTabChange}
          renderTab={({ isActive, tab }) => {
            let ref = this.tabRefs[tab.key];

            return renderTab({
              ref,
              isActive,
              tab,
              onScroll: isActive ? this.onScroll(tab) : undefined,
              onScrollBeginDrag: isActive ? this.onScrollBeginDrag : undefined,
              onScrollEndDrag: isActive ? this.onScrollEndDrag : undefined,
              onMomentumScrollEnd: isActive
                ? this.onMomentumScrollEnd
                : undefined
            });
          }}
        ></ScrollableTabView>
        <Animated.View
          style={[
            styles.header,
            {
              transform: [
                {
                  translateY: parallaxOffsetValue
                }
              ]
            }
          ]}
        >
          {renderHeader({ offsetY: parallaxOffsetValue })}
        </Animated.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0
  }
});
