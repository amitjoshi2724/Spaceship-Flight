package com.spaceshipflight.amitjoshi.spaceshipflight;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.MotionEvent;
import android.view.View;
import android.widget.TextView;
import android.graphics.Typeface;
import android.widget.RelativeLayout;
import android.content.Intent;
import android.content.res.Resources;
import android.view.WindowManager;
import android.widget.Button;
import android.graphics.Color;
import android.widget.TextView;
public class MainActivity extends AppCompatActivity {
    RelativeLayout relativeLayout;
    Button playButton, settingsButton, creditsButton, instructionsButton;
    TextView textView;
    Resources r;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        relativeLayout = (RelativeLayout)findViewById(R.id.relativeLayout);
        playButton = (Button)findViewById(R.id.playButton);
        settingsButton = (Button)findViewById(R.id.settingsButton);
        creditsButton = (Button)findViewById(R.id.creditsButton);
        instructionsButton = (Button)findViewById(R.id.instructionsButton);
        relativeLayout.setBackgroundColor(Color.BLACK);
        textView = (TextView)findViewById(R.id.textView2);
        r = getResources();
        textView.setTextSize((int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 10, r.getDisplayMetrics())));
        playButton.setTextSize((int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 7, r.getDisplayMetrics())));
        playButton.getBackground().setAlpha(20);
        creditsButton.setTextSize((int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 7, r.getDisplayMetrics())));
        creditsButton.getBackground().setAlpha(20);
        creditsButton.setTextColor(playButton.getTextColors().getDefaultColor());
        settingsButton.setTextSize((int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 7, r.getDisplayMetrics())));
        settingsButton.getBackground().setAlpha(20);
        settingsButton.setTextColor(playButton.getTextColors().getDefaultColor());
        instructionsButton.setTextSize((int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 7, r.getDisplayMetrics())));
        instructionsButton.getBackground().setAlpha(20);
        instructionsButton.setTextColor(playButton.getTextColors().getDefaultColor());
        /*playButton.setFocusable(true);
        creditsButton.setFocusable(true);
        settingsButton.setFocusable(true);
        instructionsButton.setFocusable(true);
        playButton.setFocusableInTouchMode(true);
        creditsButton.setFocusableInTouchMode(true);
        settingsButton.setFocusableInTouchMode(true);
        instructionsButton.setFocusableInTouchMode(true);*/
        textView.setTextColor(playButton.getTextColors().getDefaultColor());
        Typeface tf = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL);
        textView.setTypeface(tf);
        playButton.setTypeface(tf);
        creditsButton.setTypeface(tf);
        settingsButton.setTypeface(tf);
        instructionsButton.setTypeface(tf);
    }
    public void play(View view){
        Intent intent = new Intent(this, asteroidsxml.class);
        startActivity(intent);
    }
    public void showCredits(View view){
        Intent intent = new Intent(this, Credits.class);
        startActivity(intent);
    }
    public void showInfo(View view){
        Intent intent = new Intent(this, Instructions.class);
        startActivity(intent);
    }
}
