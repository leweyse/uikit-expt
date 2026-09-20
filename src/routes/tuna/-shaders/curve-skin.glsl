#include <skinbase_vertex>
#ifdef USE_SKINNING
{
  mat4 skinMatrix = boneMatX * skinWeight.x + boneMatY * skinWeight.y
                  + boneMatZ * skinWeight.z + boneMatW * skinWeight.w;
  dfSkinned = ( bindMatrixInverse * ( skinMatrix * ( bindMatrix * vec4( position, 1.0 ) ) ) ).xyz;
  dfSkinned *= uBodyScale;

  float arc = uHead - dfSkinned.z;
  float u = fract( arc / uTotal );
  dfP = curveRow( u, 0.0 );
  dfR = curveRow( u, 1.0 );
  dfU = curveRow( u, 2.0 );

  float station = clamp( dfSkinned.z / uBodyLength, 0.0, 1.0 );
  float envelope = ENV_BASE + ENV_GAIN * pow( station, ENV_POWER );
  dfLat = uWave * envelope
    * sin( uWavePhase - TWO_PI * dfSkinned.z / uWaveLength );

  float cosRoll = cos( uRoll );
  float sinRoll = sin( uRoll );
  vec3 rolledRight = dfR * cosRoll + dfU * sinRoll;
  dfU = dfU * cosRoll - dfR * sinRoll;
  dfR = rolledRight;
}
#else
dfSkinned = position;
dfLat = 0.0;
{
  float arc = uHead - position.z;
  float u = fract( arc / uTotal );
  dfP = curveRow( u, 0.0 );
  dfR = curveRow( u, 1.0 );
  dfU = curveRow( u, 2.0 );
}
#endif
