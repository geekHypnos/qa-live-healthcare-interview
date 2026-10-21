package com.leansofx.qaserviceuser.config;

import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.type.LogicalType;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JsonConfig {
    @Bean Jackson2ObjectMapperBuilderCustomizer strictStrings() {
        // Jackson 默认可能把数字或布尔值转换成字符串，账号输入不接受这种隐式转换。
        return builder -> builder.postConfigurer(mapper -> {
            var config = mapper.coercionConfigFor(LogicalType.Textual);
            config.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail);
            config.setCoercion(CoercionInputShape.Float, CoercionAction.Fail);
            config.setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail);
        });
    }
}
